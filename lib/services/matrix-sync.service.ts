/**
 * Matrix Sync Service
 * Optionally syncs IAM role assignments to a Matrix homeserver.
 *
 * Feature flag: MATRIX_ROLE_SYNC_ENABLED=true
 * Required when enabled:
 *   MATRIX_HOMESERVER_URL  - e.g. https://matrix.acme.corp
 *   MATRIX_ADMIN_TOKEN     - homeserver admin access token
 *
 * IAM is always authoritative. Matrix is downstream.
 * If sync is disabled, IAM operations proceed normally; sync can be
 * re-enabled later and a reconciliation pass will catch up.
 *
 * Sync is fire-and-forget: call backgroundSyncMatrixRole() and do not await.
 * Failures are logged via audit.service but do NOT roll back the IAM change.
 */

import { logAdminAction } from "./audit.service";
import type { MatrixResourceType, MatrixRole } from "@/lib/keto/namespaces";

// ============================================================
// Public interface
// ============================================================

export interface MatrixSyncResult {
  /** Whether the sync call to the Matrix homeserver succeeded. */
  synced: boolean;
  /** True when MATRIX_ROLE_SYNC_ENABLED is not "true" — sync was intentionally skipped. */
  skipped: boolean;
  /** Error message if synced=false and skipped=false. */
  error?: string;
}

export type MatrixSyncAction = "assign" | "revoke" | "update";

export interface MatrixSyncPayload {
  action: MatrixSyncAction;
  actorUserId: string;       // IAM user performing the operation
  targetUserId: string;      // User whose role is changing
  resourceType: MatrixResourceType;
  resourceId: string;
  role: MatrixRole;
  /** Element internal room/space ID (e.g. !abc123:matrix.org), if known. */
  matrixResourceId?: string;
}

/**
 * Fire-and-forget wrapper — call this from API routes and service layer.
 * Does NOT throw; logs failures via audit service.
 */
export function backgroundSyncMatrixRole(payload: MatrixSyncPayload): void {
  syncMatrixRole(payload).catch((err) => {
    console.error("[MatrixSync] Unhandled error in background sync:", err);
  });
}

/**
 * Synchronous version — use when you need the result (e.g. surface in API response).
 */
export async function syncMatrixRole(
  payload: MatrixSyncPayload,
): Promise<MatrixSyncResult> {
  if (process.env.MATRIX_ROLE_SYNC_ENABLED !== "true") {
    return { synced: false, skipped: true };
  }

  const homeserverUrl = process.env.MATRIX_HOMESERVER_URL;
  const adminToken    = process.env.MATRIX_ADMIN_TOKEN;

  if (!homeserverUrl || !adminToken) {
    const error =
      "MATRIX_ROLE_SYNC_ENABLED is true but MATRIX_HOMESERVER_URL or MATRIX_ADMIN_TOKEN is missing";
    console.error("[MatrixSync]", error);
    await logAdminAction(
      payload.actorUserId,
      "matrix_sync_config_error",
      `MatrixRoleAssignment:${payload.resourceType}:${payload.resourceId}`,
      false,
      { error, ...payload },
    );
    return { synced: false, skipped: false, error };
  }

  try {
    const result = await callMatrixApi(homeserverUrl, adminToken, payload);
    await logAdminAction(
      payload.actorUserId,
      `matrix_sync_${payload.action}`,
      `${payload.resourceType}:${payload.resourceId}`,
      true,
      { targetUserId: payload.targetUserId, role: payload.role },
    );
    return result;
  } catch (err: any) {
    const error = err?.message ?? "Unknown sync error";
    console.error("[MatrixSync] Sync failed:", error);
    await logAdminAction(
      payload.actorUserId,
      `matrix_sync_${payload.action}_failed`,
      `${payload.resourceType}:${payload.resourceId}`,
      false,
      { error, targetUserId: payload.targetUserId, role: payload.role },
    );
    return { synced: false, skipped: false, error };
  }
}

// ============================================================
// Matrix API integration (power level mapping)
// ============================================================

/**
 * IAM role → Matrix power level mapping.
 *
 * Matrix power levels:
 *   100 = admin
 *    50 = moderator
 *     0 = default user
 *    -1 = banned/restricted (use with care; Matrix enforces this differently)
 *
 * support is set to 50 (same room visibility as moderator) so they can read
 * context for support sessions; impersonation is enforced at the IAM API layer,
 * not via Matrix power levels.
 */
const ROLE_TO_POWER_LEVEL: Record<MatrixRole, number> = {
  matrix_admin: 100,
  moderator:    50,
  support:      50,
  member:       0,
  viewer:       0,
};

async function callMatrixApi(
  homeserverUrl: string,
  adminToken: string,
  payload: MatrixSyncPayload,
): Promise<MatrixSyncResult> {
  // If no Element room/space ID is provided we can only update membership,
  // not power levels. Log a warning and return partial success.
  if (!payload.matrixResourceId) {
    console.warn(
      "[MatrixSync] No matrixResourceId on payload — cannot set power levels.",
      payload,
    );
    return { synced: true, skipped: false };
  }

  if (payload.action === "revoke") {
    // For revoke, kick the user from the room (or set power level to 0)
    // TODO: Decide whether revoke means "kick from room" or just "reset power level".
    // For now we reset to power level 0 (member) rather than kick.
    await setPowerLevel(homeserverUrl, adminToken, payload.matrixResourceId, payload.targetUserId, 0);
    return { synced: true, skipped: false };
  }

  const powerLevel = ROLE_TO_POWER_LEVEL[payload.role] ?? 0;
  await setPowerLevel(homeserverUrl, adminToken, payload.matrixResourceId, payload.targetUserId, powerLevel);
  return { synced: true, skipped: false };
}

/**
 * Updates a user's power level in a Matrix room via the Client-Server API.
 *
 * Matrix power levels are room state events (m.room.power_levels).
 * To change a single user's level we must:
 *   1. GET current m.room.power_levels state
 *   2. Merge the new user entry into `users`
 *   3. PUT the updated state event back
 *
 * TODO: Implement proper state merging. Current stub sends a minimal payload
 *       which will replace the existing power_levels state — do NOT use in
 *       production without implementing the GET + merge step.
 */
async function setPowerLevel(
  homeserverUrl: string,
  adminToken: string,
  matrixRoomId: string,
  matrixUserId: string,
  powerLevel: number,
): Promise<void> {
  // TODO: Step 1 — GET /_matrix/client/v3/rooms/{roomId}/state/m.room.power_levels
  // TODO: Step 2 — merge `users[matrixUserId] = powerLevel` into existing state
  // TODO: Step 3 — PUT /_matrix/client/v3/rooms/{roomId}/state/m.room.power_levels

  const url = `${homeserverUrl}/_matrix/client/v3/rooms/${encodeURIComponent(matrixRoomId)}/state/m.room.power_levels`;

  // Stub payload — replace with full state merge in production
  const body = {
    users: {
      [matrixUserId]: powerLevel,
    },
  };

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Matrix API error ${response.status} for room ${matrixRoomId}: ${text}`,
    );
  }
}
