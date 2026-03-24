/**
 * Matrix Provision Service
 *
 * Orchestrates eager Matrix provisioning triggered by IAM events:
 *
 *   IAM Event                        → Action
 *   ──────────────────────────────────────────────────────────
 *   Identity first login / provision → provisionMatrixAccount
 *   Org created                      → bootstrapMatrixOrg
 *   Group created                    → bootstrapGroupRoom
 *   Member added to group            → syncGroupRoomJoin
 *   Member removed from group        → syncGroupRoomLeave
 *
 * All public functions have a `background*` fire-and-forget variant that
 * catches + logs errors and never throws. Use those from API route handlers.
 *
 * Feature flag: MATRIX_PROVISION_ENABLED=true
 * Required env vars (when enabled):
 *   MATRIX_HOMESERVER_URL, MATRIX_ADMIN_TOKEN, MATRIX_SERVER_NAME,
 *   MATRIX_DEFAULT_PASSWORD
 */

import { prisma } from "@/lib/db";
import { logAudit } from "./audit.service";
import {
  registerMatrixUser,
  toMatrixUserId,
  createMatrixRoom,
  addRoomToSpace,
  adminJoinRoom,
  kickFromRoom,
  setPowerLevel,
} from "@/lib/matrix-admin";
import { grantPermission } from "./keto.service";
import { assignMatrixRole } from "./matrix.service";

// ── Feature flag ──────────────────────────────────────────────────────────────

function isEnabled(): boolean {
  return process.env.MATRIX_PROVISION_ENABLED === "true";
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

// ── Account provisioning ──────────────────────────────────────────────────────

/**
 * Creates a Matrix account for an IAM identity if one does not already exist.
 * Idempotent — safe to call multiple times for the same user.
 */
export async function provisionMatrixAccount(
  iamUserId: string,
  displayName: string,
): Promise<{ matrixUserId: string }> {
  const existing = await prisma.matrixAccount.findUnique({
    where: { iamUserId },
  });
  if (existing) return { matrixUserId: existing.matrixUserId };

  const matrixUserId = toMatrixUserId(iamUserId, serverName());

  await registerMatrixUser(iamUserId, displayName, defaultPassword());

  await prisma.matrixAccount.create({
    data: { iamUserId, matrixUserId, homeserver: serverName() },
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

export function backgroundProvisionMatrixAccount(
  iamUserId: string,
  displayName: string,
): void {
  if (!isEnabled()) return;
  provisionMatrixAccount(iamUserId, displayName).catch((err) => {
    console.error("[MatrixProvision] Account provision failed:", iamUserId, err);
  });
}

// ── Org bootstrap ─────────────────────────────────────────────────────────────

/**
 * When an IAM Org is created, bootstraps:
 *   1. A MatrixOrg record linked to the IAM org
 *   2. A default "General" MatrixSpace on the homeserver
 *   3. A #general MatrixRoom inside that space
 *
 * Idempotent — checks for an existing MatrixOrg with iamOrgId before creating.
 */
export async function bootstrapMatrixOrg(
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
      homeserver: serverName(),
      iamOrgId,
    },
  });

  // 2. Create the default space on the homeserver
  const spaceMatrixId = await createMatrixRoom({
    name: orgName,
    topic: `Main space for ${orgName}`,
    isSpace: true,
  });

  // 3. Create space record
  const matrixSpace = await prisma.matrixSpace.create({
    data: {
      name: "General",
      description: `Default space for ${orgName}`,
      matrixId: spaceMatrixId,
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

  // 4. Create #general room on the homeserver
  const roomMatrixId = await createMatrixRoom({
    name: `${orgName} — General`,
    topic: `General discussion for all ${orgName} members`,
  });

  // Add room to space on the homeserver
  await addRoomToSpace(spaceMatrixId, roomMatrixId);

  // 5. Create room record
  const matrixRoom = await prisma.matrixRoom.create({
    data: {
      name: "general",
      description: `General discussion for ${orgName}`,
      matrixId: roomMatrixId,
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
    action: "matrix_org_bootstrapped",
    resource: `MatrixOrg:${matrixOrg.id}`,
    result: "granted",
    metadata: { iamOrgId, spaceMatrixId, roomMatrixId },
  });
}

export function backgroundBootstrapMatrixOrg(
  iamOrgId: string,
  orgName: string,
): void {
  if (!isEnabled()) return;
  bootstrapMatrixOrg(iamOrgId, orgName).catch((err) => {
    console.error("[MatrixProvision] Org bootstrap failed:", iamOrgId, err);
  });
}

// ── Group room provisioning ───────────────────────────────────────────────────

/**
 * When an IAM Group is created, creates a corresponding MatrixRoom in the
 * org's default (earliest) space and links it via iamGroupId.
 *
 * Idempotent — no-ops if a room linked to iamGroupId already exists.
 */
export async function bootstrapGroupRoom(
  iamGroupId: string,
  groupName: string,
  iamOrgId: string,
): Promise<void> {
  const existing = await prisma.matrixRoom.findFirst({ where: { iamGroupId } });
  if (existing) return;

  // Find the org's default space (earliest created)
  const matrixOrg = await prisma.matrixOrg.findFirst({ where: { iamOrgId } });
  if (!matrixOrg) {
    console.warn(
      `[MatrixProvision] No MatrixOrg for iamOrgId=${iamOrgId} — skipping group room bootstrap`,
    );
    return;
  }

  const space = await prisma.matrixSpace.findFirst({
    where: { orgId: matrixOrg.id },
    orderBy: { createdAt: "asc" },
  });
  if (!space) {
    console.warn(
      `[MatrixProvision] No MatrixSpace for org ${matrixOrg.id} — skipping group room bootstrap`,
    );
    return;
  }

  // Create room on homeserver
  const roomMatrixId = await createMatrixRoom({ name: groupName });

  // Add to space on homeserver (best-effort — space may not have matrixId yet)
  if (space.matrixId) {
    await addRoomToSpace(space.matrixId, roomMatrixId);
  }

  // Create room record
  const matrixRoom = await prisma.matrixRoom.create({
    data: {
      name: groupName,
      description: `Chat room for ${groupName} group`,
      matrixId: roomMatrixId,
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

// ── Group membership sync ─────────────────────────────────────────────────────

/**
 * Joins a user to the Matrix room for an IAM group and sets their power level.
 * Called after a member is added to an IAM Group.
 */
export async function syncGroupRoomJoin(
  iamGroupId: string,
  iamUserId: string,
  role: "member" | "moderator" | "matrix_admin" = "member",
): Promise<void> {
  // Use findFirst — iamGroupId is nullable in schema, findUnique rejects undefined
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
  if (!account) {
    console.warn(
      `[MatrixProvision] No MatrixAccount for user ${iamUserId} — skipping join`,
    );
    return;
  }

  await adminJoinRoom(room.matrixId, account.matrixUserId);
  await setPowerLevel(
    room.matrixId,
    account.matrixUserId,
    ROLE_TO_POWER_LEVEL[role] ?? 0,
  );

  // Sync Keto role — ignore ConflictError if already assigned
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

/**
 * Kicks a user from the Matrix room for an IAM group.
 * Called after a member is removed from an IAM Group.
 */
export async function syncGroupRoomLeave(
  iamGroupId: string,
  iamUserId: string,
): Promise<void> {
  const [room, account] = await Promise.all([
    prisma.matrixRoom.findFirst({ where: { iamGroupId } }),
    prisma.matrixAccount.findUnique({ where: { iamUserId } }),
  ]);

  if (!room?.matrixId || !account) return;

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
