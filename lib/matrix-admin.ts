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
 */

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
 * Result: "iam-<uuid>" — dashes are valid in Matrix localparts per spec.
 */
export function toMatrixLocalpart(iamUserId: string): string {
  return `iam-${iamUserId}`;
}

export function toMatrixUserId(iamUserId: string, serverName: string): string {
  return `@${toMatrixLocalpart(iamUserId)}:${serverName}`;
}

/**
 * Registers (or updates) a Matrix user via Synapse Admin API.
 * Idempotent: re-calling for an existing user updates the display name.
 *
 * Synapse: PUT /_synapse/admin/v2/users/@user:server
 */
export async function registerMatrixUser(
  iamUserId: string,
  displayName: string,
  password: string,
): Promise<{ matrixUserId: string }> {
  const { url, token, name } = cfg();
  const matrixUserId = toMatrixUserId(iamUserId, name);
  const endpoint = `${url}/_synapse/admin/v2/users/${encodeURIComponent(matrixUserId)}`;

  const res = await fetch(endpoint, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      password,
      displayname: displayName,
      admin: false,
      deactivated: false,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`registerMatrixUser ${matrixUserId} → ${res.status}: ${text}`);
  }

  return { matrixUserId };
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
 * Admin-forces a user to join a room (no invite required).
 * Synapse Admin API: POST /_synapse/admin/v1/join/{roomId}
 */
export async function adminJoinRoom(
  roomMatrixId: string,
  matrixUserId: string,
): Promise<void> {
  const { url, token } = cfg();
  const endpoint = `${url}/_synapse/admin/v1/join/${encodeURIComponent(roomMatrixId)}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ user_id: matrixUserId }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `adminJoinRoom ${matrixUserId} → ${roomMatrixId}: ${res.status}: ${text}`,
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
