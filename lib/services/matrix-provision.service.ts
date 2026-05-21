/**
 * Matrix Provision Service
 *
 * Two-phase provisioning:
 *
 *   Phase 1 — DB provisioning (always runs, no Synapse needed):
 *     Creates MatrixOrg, MatrixSpace, MatrixRoom, MatrixAccount records
 *     with matrixId = null. Triggered by IAM events.
 *
 *   Phase 2 — Homeserver sync (runs when Synapse is configured):
 *     Reads from Matrix DB tables, creates actual rooms/spaces/accounts
 *     on Synapse, and backfills the matrixId fields.
 *
 *   IAM Event                        → Phase 1 Action
 *   ──────────────────────────────────────────────────────────
 *   Identity first login / provision → provisionMatrixAccountDb
 *   Org created                      → bootstrapMatrixOrgDb
 *   Group created                    → bootstrapGroupRoomDb
 *   Member added to group            → syncGroupRoomJoin (Phase 2 only)
 *   Member removed from group        → syncGroupRoomLeave (Phase 2 only)
 *
 * Feature flag: MATRIX_PROVISION_ENABLED=true (enables DB provisioning)
 * Homeserver sync requires: MATRIX_HOMESERVER_URL, MATRIX_ADMIN_TOKEN,
 *   MATRIX_SERVER_NAME, MATRIX_DEFAULT_PASSWORD
 */

import { prisma } from "@/lib/db";
import { logAudit } from "./audit.service";
import {
  registerMatrixUser,
  toMatrixUserId,
  createMatrixRoom as createMatrixRoomOnHomeserver,
  addRoomToSpace,
  inviteToRoom,
  joinRoomAsUser,
  kickFromRoom,
  setPowerLevel,
} from "@/lib/matrix-admin";
import { createMasUser } from "./mas.service";
import { grantPermission, revokePermission } from "./keto.service";
import { assignMatrixRole } from "./matrix.service";

// ── Feature flags ────────────────────────────────────────────────────────────

function isEnabled(): boolean {
  return process.env.MATRIX_PROVISION_ENABLED === "true";
}

function isHomeserverConfigured(): boolean {
  return !!(
    process.env.MATRIX_HOMESERVER_URL &&
    process.env.MATRIX_SERVER_NAME &&
    (process.env.MATRIX_AS_TOKEN || process.env.MATRIX_ADMIN_TOKEN)
  );
}

/** MAS auto-provisions accounts on first login — skip Synapse admin registration. */
function isMasManaged(): boolean {
  return !!process.env.MAS_PUBLIC_URL;
}

function serverName(): string {
  const name = process.env.MATRIX_SERVER_NAME;
  if (!name) throw new Error("MATRIX_SERVER_NAME is not set");
  return name;
}

function defaultPassword(): string {
  return process.env.MATRIX_DEFAULT_PASSWORD ?? "ChangeMe123!";
}

// ── IAM role → Matrix power level ────────────────────────────────────────────

const ROLE_TO_POWER_LEVEL: Record<string, number> = {
  matrix_admin: 100,
  moderator: 50,
  support: 50,
  member: 0,
  viewer: 0,
};

// ═══════════════════════════════════════════════════════════════════════════════
// Phase 1 — DB provisioning (no Synapse needed)
// ═══════════════════════════════════════════════════════════════════════════════

// ── Account DB provisioning ──────────────────────────────────────────────────

/**
 * Creates a MatrixAccount DB record for an IAM identity (matrixUserId left
 * as a placeholder). Idempotent.
 */
export async function provisionMatrixAccountDb(
  iamUserId: string,
): Promise<void> {
  const existing = await prisma.matrixAccount.findUnique({
    where: { iamUserId },
  });
  if (existing) return;

  // Use a placeholder matrixUserId — backfilled when homeserver syncs
  const placeholderMatrixUserId = `@${iamUserId}:pending`;

  await prisma.matrixAccount.create({
    data: {
      iamUserId,
      matrixUserId: placeholderMatrixUserId,
      homeserver: "pending",
    },
  });
}

// ── Org DB bootstrap ─────────────────────────────────────────────────────────

/**
 * Creates MatrixOrg + default MatrixSpace + #general MatrixRoom DB records.
 * No homeserver calls — matrixId fields are null.
 * Idempotent — checks for existing MatrixOrg with iamOrgId.
 */
export async function bootstrapMatrixOrgDb(
  iamOrgId: string,
  orgName: string,
): Promise<void> {
  const existing = await prisma.matrixOrg.findFirst({ where: { iamOrgId } });
  if (existing) return;

  // 1. Create org record
  const matrixOrg = await prisma.matrixOrg.create({
    data: {
      name: orgName,
      description: `Matrix org for IAM org: ${orgName}`,
      iamOrgId,
    },
  });

  // 2. Create default space record (matrixId = null)
  const matrixSpace = await prisma.matrixSpace.create({
    data: {
      name: "General",
      description: `Default space for ${orgName}`,
      orgId: matrixOrg.id,
    },
  });

  // Link space → org in Keto
  await grantPermission({
    namespace: "MatrixSpace",
    object: matrixSpace.id,
    relation: "parent",
    subject: `MatrixOrg:${matrixOrg.id}`,
  });

  // 3. Create #general room record (matrixId = null)
  const matrixRoom = await prisma.matrixRoom.create({
    data: {
      name: "general",
      description: `General discussion for ${orgName}`,
      roomType: "general",
      spaceId: matrixSpace.id,
    },
  });

  // Link room → space in Keto
  await grantPermission({
    namespace: "MatrixRoom",
    object: matrixRoom.id,
    relation: "parent",
    subject: `MatrixSpace:${matrixSpace.id}`,
  });

  await logAudit({
    userId: "system",
    action: "matrix_org_db_provisioned",
    resource: `MatrixOrg:${matrixOrg.id}`,
    result: "granted",
    metadata: { iamOrgId },
  });
}

// ── Group room DB provisioning ───────────────────────────────────────────────

/**
 * Creates a MatrixRoom DB record linked to an IAM group.
 * No homeserver calls — matrixId is null.
 * Idempotent — no-ops if a room linked to iamGroupId already exists.
 */
export async function bootstrapGroupRoomDb(
  iamGroupId: string,
  groupName: string,
  iamOrgId: string,
): Promise<void> {
  const existing = await prisma.matrixRoom.findFirst({ where: { iamGroupId } });
  if (existing) return;

  // Find the org's default space
  const matrixOrg = await prisma.matrixOrg.findFirst({ where: { iamOrgId } });
  if (!matrixOrg) {
    console.warn(
      `[MatrixProvision] No MatrixOrg for iamOrgId=${iamOrgId} — skipping group room DB bootstrap`,
    );
    return;
  }

  const space = await prisma.matrixSpace.findFirst({
    where: { orgId: matrixOrg.id },
    orderBy: { createdAt: "asc" },
  });
  if (!space) {
    console.warn(
      `[MatrixProvision] No MatrixSpace for org ${matrixOrg.id} — skipping group room DB bootstrap`,
    );
    return;
  }

  // Create room record (matrixId = null)
  const matrixRoom = await prisma.matrixRoom.create({
    data: {
      name: groupName,
      description: `Chat room for ${groupName} group`,
      roomType: "group",
      iamGroupId,
      spaceId: space.id,
    },
  });

  // Link room → space in Keto
  await grantPermission({
    namespace: "MatrixRoom",
    object: matrixRoom.id,
    relation: "parent",
    subject: `MatrixSpace:${space.id}`,
  });
}

// ── Background wrappers (fire-and-forget from route handlers) ────────────────

export function backgroundBootstrapMatrixOrg(
  iamOrgId: string,
  orgName: string,
): void {
  if (!isEnabled()) return;
  bootstrapMatrixOrgDb(iamOrgId, orgName).catch((err) => {
    console.error("[MatrixProvision] Org DB bootstrap failed:", iamOrgId, err);
  });
}

export function backgroundBootstrapGroupRoom(
  iamGroupId: string,
  groupName: string,
  iamOrgId: string,
): void {
  if (!isEnabled()) return;
  bootstrapGroupRoom(iamGroupId, groupName, iamOrgId).catch((err) => {
    console.error("[MatrixProvision] Group room bootstrap failed:", iamGroupId, err);
  });
}

export function backgroundProvisionMatrixAccount(
  iamUserId: string,
  displayName: string,
): void {
  if (!isEnabled()) return;
  (async () => {
    await provisionMatrixAccountDb(iamUserId);
    let activated = await preProvisionOnHomeserver(iamUserId, displayName);

    // MAS-without-admin-API fallback: preProvisionOnHomeserver can't create the
    // account ahead of time, so it stays "pending" until the user logs into Element.
    // Each time this function is called (e.g. on dashboard visit), check the
    // Synapse profile endpoint — if MAS has now created the account, activate it.
    if (!activated && isMasManaged() && isHomeserverConfigured()) {
      const account = await prisma.matrixAccount.findUnique({ where: { iamUserId } });
      if (account?.homeserver === "pending") {
        const server = serverName();
        const matrixUserId = toMatrixUserId(iamUserId, server);
        const profileRes = await fetch(
          `${process.env.MATRIX_HOMESERVER_URL!}/_matrix/client/v3/profile/${encodeURIComponent(matrixUserId)}`,
        );
        if (profileRes.ok) {
          await prisma.matrixAccount.update({
            where: { iamUserId },
            data: { matrixUserId, homeserver: server },
          });
          console.log(`[MatrixProvision] Activated pending MAS account on dashboard visit: ${matrixUserId}`);
          activated = true;
        }
      }
    }

    if (!activated) return;
    // Account just became active — join any groups the user is already in.
    // This handles the race where backgroundSyncGroupRoomJoin fired while
    // the account was still pending and skipped the join.
    const { getUserGroups } = await import("./group.service");
    const groups = await getUserGroups(iamUserId);
    for (const group of groups) {
      backgroundSyncGroupRoomJoin(group.id, iamUserId, "member");
    }
  })().catch((err) => {
    console.error("[MatrixProvision] Account provision failed:", iamUserId, err);
  });
}

/** Returns true if the account was activated (written to homeserver), false if still pending. */
async function preProvisionOnHomeserver(iamUserId: string, displayName: string): Promise<boolean> {
  if (!isHomeserverConfigured()) return false;
  if (isMasManaged()) {
    // Use MAS admin API to create the user directly — this provisions them in
    // both MAS and Synapse as a proper MAS-managed account (no AS conflict).
    const masUser = await createMasUser(iamUserId);
    if (masUser) {
      const matrixUserId = toMatrixUserId(iamUserId, serverName());
      await prisma.matrixAccount.upsert({
        where: { iamUserId },
        update: { matrixUserId, homeserver: serverName() },
        create: { iamUserId, matrixUserId, homeserver: serverName() },
      });
      console.log(`[MatrixProvision] MAS account created: ${matrixUserId}`);
      return true;
    }
    // No safe pre-registration path available. Any Synapse-level pre-creation
    // (AS token or admin PUT) causes MAS to show "Localpart not available" on
    // first login because Synapse's /register/available returns false.
    // syncPendingAccounts() will activate the account after the user's first login.
    console.warn(`[MatrixProvision] MAS admin API unavailable for ${iamUserId}, staying pending`);
    return false;
  }
  const matrixUserId = toMatrixUserId(iamUserId, serverName());
  await registerMatrixUser(iamUserId, displayName, defaultPassword());
  await prisma.matrixAccount.upsert({
    where: { iamUserId },
    update: { matrixUserId, homeserver: serverName() },
    create: { iamUserId, matrixUserId, homeserver: serverName() },
  });
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Phase 2 — Homeserver sync (reads from Matrix tables, needs Synapse)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Syncs all Matrix DB records that have matrixId = null to the Synapse
 * homeserver, then backfills the matrixId.
 *
 * Processes: MatrixOrg spaces, MatrixRooms, MatrixAccounts.
 * Requires MATRIX_HOMESERVER_URL, MATRIX_ADMIN_TOKEN, MATRIX_SERVER_NAME.
 */
export async function syncToHomeserver(): Promise<{
  spaces: { synced: number; skipped: number; failed: string[] };
  rooms: { synced: number; skipped: number; failed: string[] };
  accounts: { synced: number; skipped: number; failed: string[] };
}> {
  const result = {
    spaces: { synced: 0, skipped: 0, failed: [] as string[] },
    rooms: { synced: 0, skipped: 0, failed: [] as string[] },
    accounts: { synced: 0, skipped: 0, failed: [] as string[] },
  };

  // ── 1. Sync spaces (matrixId = null) ───────────────────────────────────────

  const pendingSpaces = await prisma.matrixSpace.findMany({
    where: { matrixId: null },
    include: { org: true },
  });

  for (const space of pendingSpaces) {
    try {
      const orgName = space.org?.name ?? space.name;
      const spaceMatrixId = await createMatrixRoomOnHomeserver({
        name: orgName,
        topic: `Main space for ${orgName}`,
        isSpace: true,
      });

      await prisma.matrixSpace.update({
        where: { id: space.id },
        data: { matrixId: spaceMatrixId },
      });

      // Backfill homeserver on the org if missing
      if (space.org && !space.org.homeserver) {
        await prisma.matrixOrg.update({
          where: { id: space.org.id },
          data: { homeserver: serverName() },
        });
      }

      result.spaces.synced++;
    } catch (err) {
      console.error(`[MatrixSync] Space homeserver sync failed: ${space.id}`, err);
      result.spaces.failed.push(space.id);
    }
  }

  // ── 2. Sync rooms (matrixId = null) ────────────────────────────────────────

  const pendingRooms = await prisma.matrixRoom.findMany({
    where: { matrixId: null },
    include: { space: true },
  });

  for (const room of pendingRooms) {
    try {
      const roomMatrixId = await createMatrixRoomOnHomeserver({
        name: room.name,
        topic: room.description ?? undefined,
      });

      // Add to space on homeserver if space has a matrixId
      if (room.space?.matrixId) {
        await addRoomToSpace(room.space.matrixId, roomMatrixId).catch((err) => {
          console.warn(`[MatrixSync] addRoomToSpace best-effort failed for room ${room.id}:`, err);
        });
      }

      await prisma.matrixRoom.update({
        where: { id: room.id },
        data: { matrixId: roomMatrixId },
      });

      result.rooms.synced++;
    } catch (err) {
      console.error(`[MatrixSync] Room homeserver sync failed: ${room.id}`, err);
      result.rooms.failed.push(room.id);
    }
  }

  // ── 3. Sync accounts (homeserver = "pending") ─────────────────────────────
  // In MAS mode: MAS creates Synapse accounts on first Element login. We check via
  // profile API whether the user exists yet (no registration — that would block MAS).
  // In non-MAS mode: register via AS token as before.

  const pendingAccounts = await prisma.matrixAccount.findMany({
    where: { homeserver: "pending" },
  });

  if (isMasManaged()) {
    const hsUrl = process.env.MATRIX_HOMESERVER_URL!;
    for (const account of pendingAccounts) {
      try {
        const matrixUserId = toMatrixUserId(account.iamUserId, serverName());
        // Check if MAS has created the Synapse account (user's first login has happened)
        const profileRes = await fetch(
          `${hsUrl}/_matrix/client/v3/profile/${encodeURIComponent(matrixUserId)}`,
        );
        if (profileRes.status === 404) {
          // User hasn't logged into Element yet — skip until they do
          result.accounts.skipped++;
          continue;
        }
        await prisma.matrixAccount.update({
          where: { id: account.id },
          data: { matrixUserId, homeserver: serverName() },
        });
        result.accounts.synced++;
      } catch (err) {
        console.error(`[MatrixSync] MAS account check failed: ${account.iamUserId}`, err);
        result.accounts.failed.push(account.iamUserId);
      }
    }
  } else {
    for (const account of pendingAccounts) {
      try {
        const matrixUserId = toMatrixUserId(account.iamUserId, serverName());

        await registerMatrixUser(account.iamUserId, account.iamUserId, defaultPassword());

        await prisma.matrixAccount.update({
          where: { id: account.id },
          data: { matrixUserId, homeserver: serverName() },
        });

        result.accounts.synced++;
      } catch (err) {
        console.error(`[MatrixSync] Account homeserver sync failed: ${account.iamUserId}`, err);
        result.accounts.failed.push(account.iamUserId);
      }
    }
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Legacy exports — kept for callers that need the combined flow
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Full bootstrap: DB + homeserver (only when Synapse is configured).
 * Used by the sync route when homeserver is available.
 */
export async function bootstrapMatrixOrg(
  iamOrgId: string,
  orgName: string,
): Promise<void> {
  await bootstrapMatrixOrgDb(iamOrgId, orgName);
  if (isHomeserverConfigured()) {
    await syncToHomeserver();
  }
}

export async function bootstrapGroupRoom(
  iamGroupId: string,
  groupName: string,
  iamOrgId: string,
): Promise<void> {
  await bootstrapGroupRoomDb(iamGroupId, groupName, iamOrgId);
  if (isHomeserverConfigured()) {
    await syncToHomeserver();
  }
}

export async function provisionMatrixAccount(
  iamUserId: string,
  displayName: string,
): Promise<{ matrixUserId: string }> {
  const existing = await prisma.matrixAccount.findUnique({
    where: { iamUserId },
  });
  if (existing && existing.homeserver !== "pending") {
    return { matrixUserId: existing.matrixUserId };
  }

  await provisionMatrixAccountDb(iamUserId);

  if (isHomeserverConfigured() && !isMasManaged()) {
    const matrixUserId = toMatrixUserId(iamUserId, serverName());
    await registerMatrixUser(iamUserId, displayName, defaultPassword());
    await prisma.matrixAccount.update({
      where: { iamUserId },
      data: { matrixUserId, homeserver: serverName() },
    });

    await logAudit({
      userId: "system",
      action: "matrix_account_created",
      resource: `MatrixAccount:${iamUserId}`,
      result: "granted",
      metadata: { matrixUserId },
    });

    return { matrixUserId };
  }

  return { matrixUserId: `@iam-${iamUserId}:pending` };
}

// ── Group membership sync (Phase 2 only — needs homeserver) ──────────────────

export async function syncGroupRoomJoin(
  iamGroupId: string,
  iamUserId: string,
  role: "member" | "moderator" | "matrix_admin" = "member",
): Promise<void> {
  let [room, account] = await Promise.all([
    prisma.matrixRoom.findFirst({ where: { iamGroupId } }),
    prisma.matrixAccount.findUnique({ where: { iamUserId } }),
  ]);

  if (!room?.matrixId) {
    console.warn(
      `[MatrixProvision] No matrixId on room for group ${iamGroupId} — skipping join`,
    );
    return;
  }

  // Account is pending — resolve before joining.
  if (!account || account.homeserver === "pending") {
    if (!isHomeserverConfigured()) {
      console.warn(
        `[MatrixProvision] No synced MatrixAccount for user ${iamUserId} and homeserver not configured — skipping join`,
      );
      return;
    }
    const matrixUserId = toMatrixUserId(iamUserId, serverName());
    if (isMasManaged()) {
      // In MAS mode never pre-register (blocks MAS login). Check if the user's
      // first Element login has already happened via the profile endpoint.
      const hsUrl = process.env.MATRIX_HOMESERVER_URL!;
      const profileRes = await fetch(
        `${hsUrl}/_matrix/client/v3/profile/${encodeURIComponent(matrixUserId)}`,
      );
      if (profileRes.status === 404) {
        console.warn(
          `[MatrixProvision] MAS user ${iamUserId} hasn't logged into Element yet — skipping join`,
        );
        return;
      }
      await prisma.matrixAccount.upsert({
        where: { iamUserId },
        update: { matrixUserId, homeserver: serverName() },
        create: { iamUserId, matrixUserId, homeserver: serverName() },
      });
    } else {
      await preProvisionOnHomeserver(iamUserId, iamUserId);
    }
    account = await prisma.matrixAccount.findUnique({ where: { iamUserId } });
    if (!account || account.homeserver === "pending") {
      console.warn(
        `[MatrixProvision] Could not resolve MatrixAccount for user ${iamUserId} — skipping join`,
      );
      return;
    }
  }

  // Ensure @iam-bot is in the room before inviting the user. Required for
  // sending invites and setting power levels. For rooms created after
  // 2026-05-20 the bot is the creator (already in). For pre-migration rooms
  // the AS token will attempt to join the bot; if that also fails the
  // subsequent invite will fail and the error will surface in memberships.failed.
  await joinRoomAsUser(room.matrixId, `@iam-bot:${serverName()}`).catch((err) => {
    console.warn(
      `[MatrixProvision] @iam-bot could not join room ${room.id} — ` +
      `if this is a pre-migration room, invite @iam-bot manually:`,
      err instanceof Error ? err.message : err,
    );
  });

  await inviteToRoom(room.matrixId, account.matrixUserId);
  await joinRoomAsUser(room.matrixId, account.matrixUserId);
  await setPowerLevel(
    room.matrixId,
    account.matrixUserId,
    ROLE_TO_POWER_LEVEL[role] ?? 0,
  ).catch((err) => {
    // Bot not in room (existing room created before AS token migration) — join still succeeds
    console.warn(
      `[MatrixProvision] Could not set power level for ${iamUserId} in room ${room.id}:`,
      err instanceof Error ? err.message : err,
    );
  });

  await assignMatrixRole({
    userId: iamUserId,
    resourceType: "room",
    resourceId: room.id,
    role,
  }).catch(() => undefined);
}

export function backgroundSyncGroupRoomJoin(
  iamGroupId: string,
  iamUserId: string,
  role: "member" | "moderator" | "matrix_admin" = "member",
): void {
  if (!isEnabled()) return;
  syncGroupRoomJoin(iamGroupId, iamUserId, role).catch((err) => {
    console.error("[MatrixProvision] Group room join failed:", iamUserId, err);
  });
}

export async function syncGroupRoomLeave(
  iamGroupId: string,
  iamUserId: string,
): Promise<void> {
  const [room, account] = await Promise.all([
    prisma.matrixRoom.findFirst({ where: { iamGroupId } }),
    prisma.matrixAccount.findUnique({ where: { iamUserId } }),
  ]);

  if (!room) return;

  // Remove IAM-level role assignment and Keto permission regardless of whether
  // the account is active on the homeserver — stale records cause ghost members.
  const assignment = await prisma.matrixRoleAssignment.findFirst({
    where: { userId: iamUserId, resourceType: "room", resourceId: room.id },
  });
  if (assignment) {
    await prisma.matrixRoleAssignment.delete({ where: { id: assignment.id } });
    await revokePermission({
      namespace: "MatrixRoom",
      object: room.id,
      relation: assignment.role,
      subject: iamUserId,
    }).catch(() => {});
  }

  if (!room.matrixId || !account || account.homeserver === "pending") return;

  await kickFromRoom(room.matrixId, account.matrixUserId);
}

export function backgroundSyncGroupRoomLeave(
  iamGroupId: string,
  iamUserId: string,
): void {
  if (!isEnabled()) return;
  syncGroupRoomLeave(iamGroupId, iamUserId).catch((err) => {
    console.error("[MatrixProvision] Group room leave failed:", iamUserId, err);
  });
}

// ── Pending account activation ────────────────────────────────────────────────

/**
 * Checks all matrix_accounts with homeserver="pending" against the Synapse
 * profile API. For any user who has now logged into Element (MAS created their
 * account), activates the record and fires room joins for all their groups.
 *
 * Safe to run frequently — profile checks are read-only and room joins are
 * idempotent (M_USER_IN_ROOM is silently ignored).
 */
export async function syncPendingAccounts(): Promise<void> {
  if (!isEnabled() || !isHomeserverConfigured() || !isMasManaged()) return;

  const pending = await prisma.matrixAccount.findMany({
    where: { homeserver: "pending" },
  });
  if (pending.length === 0) return;

  console.log(`[MatrixProvision] Checking ${pending.length} pending account(s)`);

  const hsUrl = process.env.MATRIX_HOMESERVER_URL!;
  const server = serverName();

  // Import lazily to avoid circular module reference at module load time
  const { getUserGroups } = await import("./group.service");

  for (const account of pending) {
    try {
      const matrixUserId = toMatrixUserId(account.iamUserId, server);
      const profileRes = await fetch(
        `${hsUrl}/_matrix/client/v3/profile/${encodeURIComponent(matrixUserId)}`,
      );
      if (profileRes.status === 404) continue;

      // User has logged into Element — activate their record
      await prisma.matrixAccount.update({
        where: { id: account.id },
        data: { matrixUserId, homeserver: server },
      });
      console.log(`[MatrixProvision] Activated pending account: ${matrixUserId}`);

      // Join them to all their current group rooms
      const groups = await getUserGroups(account.iamUserId);
      for (const group of groups) {
        backgroundSyncGroupRoomJoin(group.id, account.iamUserId, "member");
      }
    } catch (err) {
      console.error(`[MatrixProvision] Pending check failed: ${account.iamUserId}`, err);
    }
  }
}
