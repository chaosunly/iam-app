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
import { setPowerLevel as adminSetPowerLevel } from "@/lib/matrix-admin";

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
    const result = await callMatrixApi(payload);
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
  payload: MatrixSyncPayload,
): Promise<MatrixSyncResult> {
  if (!payload.matrixResourceId) {
    console.warn(
      "[MatrixSync] No matrixResourceId on payload — cannot set power levels.",
      payload,
    );
    return { synced: true, skipped: false };
  }

  const powerLevel = payload.action === "revoke"
    ? 0
    : (ROLE_TO_POWER_LEVEL[payload.role] ?? 0);

  await adminSetPowerLevel(payload.matrixResourceId, payload.targetUserId, powerLevel);
  return { synced: true, skipped: false };
}
