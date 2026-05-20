/**
 * Matrix Admin API Client
 *
 * Wraps Synapse Admin API (/_synapse/admin) and Matrix Client-Server API
 * (/_matrix/client/v3) for privileged operations.
 *
 * All functions throw on HTTP error. Callers (matrix-provision.service.ts,
 * matrix-sync.service.ts) should catch and handle — IAM is always authoritative
 * and these calls are fire-and-forget syncs.
 *
 * Required env vars:
 *   MATRIX_HOMESERVER_URL  e.g. https://matrix.acme.corp
 *   MATRIX_ADMIN_TOKEN     Synapse admin access token
 *   MATRIX_SERVER_NAME     e.g. matrix.acme.corp
 *
 * Optional:
 *   MATRIX_REGISTRATION_SECRET  Synapse registration_shared_secret — when set,
 *     registerMatrixUser uses the shared-secret endpoint instead of the admin
 *     API, so MATRIX_ADMIN_TOKEN is not required to be a server admin and the
 *     credential never expires.
 */

import { createHmac } from "crypto";

// ── Config ────────────────────────────────────────────────────────────────────

function cfg() {
  const url   = process.env.MATRIX_HOMESERVER_URL;
  const token = process.env.MATRIX_ADMIN_TOKEN;
  const name  = process.env.MATRIX_SERVER_NAME;
  if (!url || !token || !name) {
    throw new Error(
      "MATRIX_HOMESERVER_URL, MATRIX_ADMIN_TOKEN and MATRIX_SERVER_NAME must all be set",
    );
  }
  return { url, token, name };
}

// ── Identity ──────────────────────────────────────────────────────────────────

/**
 * Derives a deterministic Matrix localpart from a Kratos user ID (UUID).
 * Result: "<uuid>" — dashes are valid in Matrix localparts per spec.
 */
export function toMatrixLocalpart(iamUserId: string): string {
  return iamUserId;
}

export function toMatrixUserId(iamUserId: string, serverName: string): string {
  return `@${toMatrixLocalpart(iamUserId)}:${serverName}`;
}

/**
 * Registers a Matrix user. Priority order:
 *   1. Application Service token (MATRIX_AS_TOKEN) — never expires, no admin needed.
 *      Requires IAM AS namespace in iam-registration.yaml to cover UUID localparts.
 *   2. Shared secret (MATRIX_REGISTRATION_SECRET) — no admin token, but disabled
 *      when MAS is active (Synapse returns 404).
 *   3. Admin API (MATRIX_ADMIN_TOKEN) — fallback; requires a server-admin token.
 * Idempotent — safe to call for users that already exist.
 */
export async function registerMatrixUser(
  iamUserId: string,
  displayName: string,
  password?: string,
): Promise<{ matrixUserId: string }> {
  const { url, name } = cfg();
  const matrixUserId = toMatrixUserId(iamUserId, name);
  const localpart    = toMatrixLocalpart(iamUserId);
  const asToken      = process.env.MATRIX_AS_TOKEN;
  const secret       = process.env.MATRIX_REGISTRATION_SECRET;

  if (asToken) {
    return registerWithAS(url, matrixUserId, localpart, asToken);
  }

  if (secret) {
    return registerWithSharedSecret(url, matrixUserId, localpart, displayName, password, secret);
  }

  // Fallback: admin API (requires MATRIX_ADMIN_TOKEN to belong to a server admin)
  const { token } = cfg();
  const endpoint = `${url}/_synapse/admin/v2/users/${encodeURIComponent(matrixUserId)}`;
  const body: Record<string, unknown> = { displayname: displayName, admin: false, deactivated: false };
  if (password !== undefined) body.password = password;

  const res = await fetch(endpoint, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`registerMatrixUser ${matrixUserId} → ${res.status}: ${text}`);
  }
  return { matrixUserId };
}

// Uses the IAM Application Service token to register a user in Synapse.
// The AS token is registered directly in Synapse and never expires.
// Requires the UUID namespace to be declared in iam-registration.yaml.
async function registerWithAS(
  homeserverUrl: string,
  matrixUserId: string,
  localpart: string,
  asToken: string,
): Promise<{ matrixUserId: string }> {
  const res = await fetch(`${homeserverUrl}/_matrix/client/v3/register`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${asToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ type: "m.login.application_service", username: localpart }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({} as { errcode?: string })) as { errcode?: string };
    if (data.errcode === "M_USER_IN_USE") return { matrixUserId }; // already exists — idempotent
    throw new Error(`registerMatrixUser (AS) ${matrixUserId} → ${res.status}: ${JSON.stringify(data)}`);
  }
  return { matrixUserId };
}

async function registerWithSharedSecret(
  homeserverUrl: string,
  matrixUserId: string,
  localpart: string,
  displayName: string,
  password: string | undefined,
  secret: string,
): Promise<{ matrixUserId: string }> {
  // Step 1: fetch nonce
  const nonceRes = await fetch(`${homeserverUrl}/_synapse/admin/v1/register`);
  if (!nonceRes.ok) {
    throw new Error(`registerMatrixUser nonce fetch → ${nonceRes.status}`);
  }
  const { nonce } = await nonceRes.json() as { nonce: string };

  // Step 2: HMAC-SHA1(nonce\x00localpart\x00password\x00notadmin)
  // Password is required in the MAC even in MAS deployments (stored but unusable
  // because password_config is disabled); use placeholder when caller omits it.
  const effectivePassword = password ?? "ChangeMe123!";
  const mac = createHmac("sha1", secret)
    .update(`${nonce}\x00${localpart}\x00${effectivePassword}\x00notadmin`)
    .digest("hex");

  // Step 3: register
  const regRes = await fetch(`${homeserverUrl}/_synapse/admin/v1/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nonce, username: localpart, displayname: displayName, password: effectivePassword, admin: false, mac }),
  });

  if (!regRes.ok) {
    const data = await regRes.json().catch(() => ({} as { errcode?: string })) as { errcode?: string };
    if (data.errcode === "M_USER_IN_USE") return { matrixUserId }; // already exists — idempotent
    throw new Error(`registerMatrixUser ${matrixUserId} → ${regRes.status}: ${JSON.stringify(data)}`);
  }
  return { matrixUserId };
}

/**
 * Sets or unsets server-admin status for a Matrix user.
 * Requires a proper OAuth2 admin token (mat_...) — compat tokens (mct_...) lack admin scope.
 *
 * Synapse Admin API: PUT /_synapse/admin/v2/users/@user:server
 */
export async function setMatrixUserAdmin(
  matrixUserId: string,
  isAdmin: boolean,
): Promise<void> {
  const { url, token } = cfg();
  const endpoint = `${url}/_synapse/admin/v2/users/${encodeURIComponent(matrixUserId)}`;

  const res = await fetch(endpoint, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ admin: isAdmin }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`setMatrixUserAdmin ${matrixUserId} admin=${isAdmin} → ${res.status}: ${text}`);
  }
}

/**
 * Deactivates a Matrix account (soft-delete; irreversible in standard Matrix).
 * Synapse: POST /_synapse/admin/v1/deactivate/@user:server
 */
export async function deactivateMatrixUser(matrixUserId: string): Promise<void> {
  const { url, token } = cfg();
  const endpoint = `${url}/_synapse/admin/v1/deactivate/${encodeURIComponent(matrixUserId)}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ erase: false }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`deactivateMatrixUser ${matrixUserId} → ${res.status}: ${text}`);
  }
}

// ── Rooms & Spaces ────────────────────────────────────────────────────────────

export interface CreateRoomOptions {
  name: string;
  topic?: string;
  /** true → creates a Matrix space (room with type m.space) */
  isSpace?: boolean;
  isPublic?: boolean;
}

/**
 * Creates a room (or space) as the admin user.
 * Returns the Matrix room ID: "!abc123:server"
 *
 * Matrix Client-Server API: POST /_matrix/client/v3/createRoom
 */
export async function createMatrixRoom(opts: CreateRoomOptions): Promise<string> {
  const { url, token } = cfg();
  const endpoint = `${url}/_matrix/client/v3/createRoom`;

  const body: Record<string, unknown> = {
    name: opts.name,
    preset: opts.isPublic ? "public_chat" : "private_chat",
    creation_content: opts.isSpace ? { type: "m.space" } : {},
  };
  if (opts.topic) body.topic = opts.topic;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`createMatrixRoom "${opts.name}" → ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { room_id: string };
  return data.room_id;
}

/**
 * Adds a child room to a Matrix space.
 * PUT /_matrix/client/v3/rooms/{spaceId}/state/m.space.child/{childRoomId}
 */
export async function addRoomToSpace(
  spaceMatrixId: string,
  roomMatrixId: string,
): Promise<void> {
  const { url, token, name } = cfg();
  const endpoint =
    `${url}/_matrix/client/v3/rooms/${encodeURIComponent(spaceMatrixId)}` +
    `/state/m.space.child/${encodeURIComponent(roomMatrixId)}`;

  const res = await fetch(endpoint, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ via: [name], suggested: false }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `addRoomToSpace ${roomMatrixId} → ${spaceMatrixId}: ${res.status}: ${text}`,
    );
  }
}

// ── Membership ────────────────────────────────────────────────────────────────

/**
 * Force-joins a user to a room using the Application Service token.
 * The AS token bypasses MAS auth entirely — registered in Synapse's homeserver.yaml.
 * Call this after inviteToRoom to auto-accept the invite on behalf of the user.
 *
 * Requires env var: MATRIX_AS_TOKEN (IAM application service token)
 *
 * Matrix Client-Server API: POST /_matrix/client/v3/join/{roomId}?user_id=@iam-user:server
 */
export async function joinRoomAsUser(
  roomMatrixId: string,
  matrixUserId: string,
): Promise<void> {
  const { url } = cfg();
  const asToken = process.env.MATRIX_AS_TOKEN;
  if (!asToken) return; // AS not configured — invite-only fallback

  const endpoint =
    `${url}/_matrix/client/v3/join/${encodeURIComponent(roomMatrixId)}` +
    `?user_id=${encodeURIComponent(matrixUserId)}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${asToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({} as { errcode?: string })) as { errcode?: string };
    // Already in room — not an error
    if (data.errcode === "M_FORBIDDEN" || data.errcode === "M_USER_IN_ROOM") return;
    throw new Error(
      `joinRoomAsUser ${matrixUserId} → ${roomMatrixId}: ${res.status}: ${JSON.stringify(data)}`,
    );
  }
}

/**
 * Invites a user to a room via Matrix Client-Server API.
 * Replaces adminJoinRoom — works with MAS compat tokens (no Synapse admin needed).
 * Silently ignores M_FORBIDDEN and M_USER_IN_ROOM (already invited / already joined).
 *
 * Matrix Client-Server API: POST /_matrix/client/v3/rooms/{roomId}/invite
 */
export async function inviteToRoom(
  roomMatrixId: string,
  matrixUserId: string,
): Promise<void> {
  const { url, token } = cfg();
  const endpoint = `${url}/_matrix/client/v3/rooms/${encodeURIComponent(roomMatrixId)}/invite`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ user_id: matrixUserId }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({} as { errcode?: string })) as { errcode?: string };
    if (data.errcode === "M_FORBIDDEN" || data.errcode === "M_USER_IN_ROOM") return;
    throw new Error(
      `inviteToRoom ${matrixUserId} → ${roomMatrixId}: ${res.status}: ${JSON.stringify(data)}`,
    );
  }
}

/**
 * Kicks a user from a room.
 * Matrix Client-Server API: POST /_matrix/client/v3/rooms/{roomId}/kick
 */
export async function kickFromRoom(
  roomMatrixId: string,
  matrixUserId: string,
  reason = "Removed from IAM group",
): Promise<void> {
  const { url, token } = cfg();
  const endpoint = `${url}/_matrix/client/v3/rooms/${encodeURIComponent(roomMatrixId)}/kick`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ user_id: matrixUserId, reason }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`kickFromRoom ${matrixUserId} from ${roomMatrixId}: ${res.status}: ${text}`);
  }
}

// ── Power levels ──────────────────────────────────────────────────────────────

/**
 * Fetches the current m.room.power_levels state event for a room.
 */
async function getPowerLevels(
  url: string,
  token: string,
  roomMatrixId: string,
): Promise<Record<string, unknown>> {
  const endpoint =
    `${url}/_matrix/client/v3/rooms/${encodeURIComponent(roomMatrixId)}/state/m.room.power_levels`;

  const res = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`getPowerLevels ${roomMatrixId}: ${res.status}: ${text}`);
  }

  return res.json() as Promise<Record<string, unknown>>;
}

/**
 * Sets a single user's power level in a room using GET → merge → PUT.
 * This preserves all other users' power levels in the room.
 */
export async function setPowerLevel(
  roomMatrixId: string,
  matrixUserId: string,
  level: number,
): Promise<void> {
  const { url, token } = cfg();

  // Step 1: GET current state
  const current = await getPowerLevels(url, token, roomMatrixId);

  // Step 2: Merge — update only this user, preserve everyone else
  const existingUsers = (current.users as Record<string, number>) ?? {};
  const merged = {
    ...current,
    users: { ...existingUsers, [matrixUserId]: level },
  };

  // Step 3: PUT updated state back
  const endpoint =
    `${url}/_matrix/client/v3/rooms/${encodeURIComponent(roomMatrixId)}/state/m.room.power_levels`;

  const res = await fetch(endpoint, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(merged),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `setPowerLevel ${matrixUserId}=${level} in ${roomMatrixId}: ${res.status}: ${text}`,
    );
  }
}
