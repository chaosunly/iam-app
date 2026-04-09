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
  setMatrixUserAdmin,
  toMatrixUserId,
  createMatrixRoom as createMatrixRoomOnHomeserver,
  addRoomToSpace,
  inviteToRoom,
  joinRoomAsUser,
  kickFromRoom,
  setPowerLevel,
} from "@/lib/matrix-admin";
import { checkPermission } from "@/lib/keto";
import { grantPermission } from "./keto.service";
import { assignMatrixRole } from "./matrix.service";

// ── Feature flags ────────────────────────────────────────────────────────────

function isEnabled(): boolean {
  return process.env.MATRIX_PROVISION_ENABLED === "true";
}

function isHomeserverConfigured(): boolean {
  return !!(
    process.env.MATRIX_HOMESERVER_URL &&
    process.env.MATRIX_ADMIN_TOKEN &&
    process.env.MATRIX_SERVER_NAME
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
  const placeholderMatrixUserId = `@iam-${iamUserId}:pending`;

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
  _displayName: string,
): void {
  if (!isEnabled()) return;
  provisionMatrixAccountDb(iamUserId).catch((err) => {
    console.error("[MatrixProvision] Account DB provision failed:", iamUserId, err);
  });
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
  // When MAS is managing auth (MSC3861), skip registration — MAS auto-provisions
  // accounts on first login via Element. IAM DB records stay "pending" until then.

  const pendingAccounts = await prisma.matrixAccount.findMany({
    where: { homeserver: "pending" },
  });

  if (isMasManaged()) {
    result.accounts.skipped = pendingAccounts.length;
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

  // ── 4. Sync Matrix server-admin status for IAM global admins ─────────────
  // Any IAM user with GlobalRole:admin gets promoted to Matrix server admin.
  // Runs for all synced accounts (homeserver != "pending").
  // Skipped gracefully if admin token lacks admin scope (will retry on next sync).

  const syncedAccounts = await prisma.matrixAccount.findMany({
    where: { NOT: { homeserver: "pending" } },
  });

  for (const account of syncedAccounts) {
    const isGlobalAdmin = await checkPermission({
      namespace: "GlobalRole",
      object: "admin",
      relation: "is_admin",
      subject: account.iamUserId,
    }).catch(() => false);

    if (isGlobalAdmin) {
      await setMatrixUserAdmin(account.matrixUserId, true).catch((err) => {
        console.warn(
          `[MatrixSync] Could not set Matrix admin for ${account.matrixUserId} — ` +
          `admin token may lack admin scope: ${err instanceof Error ? err.message : err}`,
        );
      });
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
  const [room, account] = await Promise.all([
    prisma.matrixRoom.findFirst({ where: { iamGroupId } }),
    prisma.matrixAccount.findUnique({ where: { iamUserId } }),
  ]);

  if (!room?.matrixId) {
    console.warn(
      `[MatrixProvision] No matrixId on room for group ${iamGroupId} — skipping join`,
    );
    return;
  }
  if (!account || account.homeserver === "pending") {
    console.warn(
      `[MatrixProvision] No synced MatrixAccount for user ${iamUserId} — skipping join`,
    );
    return;
  }

  await inviteToRoom(room.matrixId, account.matrixUserId);
  await joinRoomAsUser(room.matrixId, account.matrixUserId);
  await setPowerLevel(
    room.matrixId,
    account.matrixUserId,
    ROLE_TO_POWER_LEVEL[role] ?? 0,
  );

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

  if (!room?.matrixId || !account || account.homeserver === "pending") return;

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
