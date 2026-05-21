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
 *   MATRIX_SERVER_NAME     e.g. matrix.acme.corp
 *
 * Recommended (replaces MATRIX_ADMIN_TOKEN for all room/membership ops):
 *   MATRIX_AS_TOKEN        IAM Application Service token — never expires, rate_limited: false.
 *                          Room creation, invites, joins, power levels, and kicks all use
 *                          the AS bot (@iam-bot:<server>) when this is set.
 *
 * Optional:
 *   MATRIX_ADMIN_TOKEN     Only required for setMatrixUserAdmin (server-admin promotion).
 *   MATRIX_REGISTRATION_SECRET  Synapse registration_shared_secret fallback.
 */

import { createHmac } from "crypto";

// ── Config ────────────────────────────────────────────────────────────────────

function cfg() {
  const url  = process.env.MATRIX_HOMESERVER_URL;
  const name = process.env.MATRIX_SERVER_NAME;
  if (!url || !name) {
    throw new Error("MATRIX_HOMESERVER_URL and MATRIX_SERVER_NAME must be set");
  }
  return { url, token: process.env.MATRIX_ADMIN_TOKEN ?? "", name };
}

// Returns the IAM AS bot user ID — the identity used for all room operations when
// MATRIX_AS_TOKEN is set. Matches the sender_localpart in iam-registration.yaml.
function botUserId(serverName: string): string {
  return `@iam-bot:${serverName}`;
}

// When MATRIX_AS_TOKEN is set, returns [asToken, "?user_id=@iam-bot:server"].
// Otherwise returns [adminToken, ""] so callers fall back to the admin token path.
function roomAuth(adminToken: string, serverName: string): { authToken: string; userIdParam: string } {
  const asToken = process.env.MATRIX_AS_TOKEN;
  if (asToken) {
    return { authToken: asToken, userIdParam: `?user_id=${encodeURIComponent(botUserId(serverName))}` };
  }
  return { authToken: adminToken, userIdParam: "" };
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
    body: JSON.stringify({ type: "m.login.application_service", username: localpart, inhibit_login: true }),
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
 * Creates (or updates) a Synapse user via the admin PUT endpoint.
 *
 * Unlike registerMatrixUser, this NEVER uses the AS token register path, so it
 * creates the user with appservice_id=NULL. MAS can safely adopt these users on
 * first login (it calls the same idempotent PUT internally). Use this in MAS mode
 * to pre-provision accounts without causing "Localpart not available" conflicts.
 *
 * Requires MATRIX_ADMIN_TOKEN to be a Synapse server-admin token.
 */
export async function ensureMatrixUserExists(
  matrixUserId: string,
  displayName: string,
): Promise<void> {
  const { url, token } = cfg();
  if (!token) throw new Error("MATRIX_ADMIN_TOKEN is required for ensureMatrixUserExists");

  const res = await fetch(
    `${url}/_synapse/admin/v2/users/${encodeURIComponent(matrixUserId)}`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ displayname: displayName, admin: false, deactivated: false }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ensureMatrixUserExists ${matrixUserId} → ${res.status}: ${text}`);
  }
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
 * Creates a room (or space) as @iam-bot when MATRIX_AS_TOKEN is set (preferred),
 * otherwise falls back to the admin user via MATRIX_ADMIN_TOKEN.
 * Returns the Matrix room ID: "!abc123:server"
 *
 * Matrix Client-Server API: POST /_matrix/client/v3/createRoom
 */
export async function createMatrixRoom(opts: CreateRoomOptions): Promise<string> {
  const { url, token, name } = cfg();
  const { authToken, userIdParam } = roomAuth(token, name);
  const endpoint = `${url}/_matrix/client/v3/createRoom${userIdParam}`;

  const body: Record<string, unknown> = {
    name: opts.name,
    preset: opts.isPublic ? "public_chat" : "private_chat",
    creation_content: opts.isSpace ? { type: "m.space" } : {},
  };
  if (opts.topic) body.topic = opts.topic;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
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
  const { authToken, userIdParam } = roomAuth(token, name);
  const endpoint =
    `${url}/_matrix/client/v3/rooms/${encodeURIComponent(spaceMatrixId)}` +
    `/state/m.space.child/${encodeURIComponent(roomMatrixId)}${userIdParam}`;

  const res = await fetch(endpoint, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${authToken}`,
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
  const { url, token } = cfg();
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
    const data = await res.json().catch(() => ({} as { errcode?: string; error?: string })) as { errcode?: string; error?: string };

    // Pre-migration users and MAS-managed users were not created by this AS, so
    // Synapse rejects ?user_id impersonation. Fall back to the admin force-join
    // API which has no AS ownership requirement.
    if (data.errcode === "M_FORBIDDEN" && data.error?.includes("not registered this user")) {
      if (!token) {
        console.warn(
          `[MatrixAdmin] joinRoomAsUser: AS impersonation rejected for ${matrixUserId}; ` +
          `MATRIX_ADMIN_TOKEN not set — user will need to accept invite manually`,
        );
        return;
      }
      const adminRes = await fetch(
        `${url}/_synapse/admin/v1/join/${encodeURIComponent(roomMatrixId)}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: matrixUserId }),
        },
      );
      if (!adminRes.ok) {
        const text = await adminRes.text();
        throw new Error(
          `joinRoomAsUser ${matrixUserId} → ${roomMatrixId}: ${adminRes.status}: ${text}`,
        );
      }
      return;
    }

    throw new Error(
      `joinRoomAsUser ${matrixUserId} → ${roomMatrixId}: ${res.status}: ${JSON.stringify(data)}`,
    );
  }
}

/**
 * Invites a user to a room.
 * When MATRIX_AS_TOKEN is set, sends the invite as @iam-bot (rate_limited: false,
 * never expires). Falls back to MATRIX_ADMIN_TOKEN if AS token is absent.
 * M_FORBIDDEN is silently ignored — happens when the bot isn't yet a member of
 * an existing room; joinRoomAsUser handles the join via AS token or admin fallback.
 *
 * Matrix Client-Server API: POST /_matrix/client/v3/rooms/{roomId}/invite
 */
export async function inviteToRoom(
  roomMatrixId: string,
  matrixUserId: string,
): Promise<void> {
  const { url, token, name } = cfg();
  const { authToken, userIdParam } = roomAuth(token, name);
  const endpoint = `${url}/_matrix/client/v3/rooms/${encodeURIComponent(roomMatrixId)}/invite${userIdParam}`;

  const doInvite = () =>
    fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: matrixUserId }),
    });

  let res = await doInvite();

  // 429 only possible on admin token path; AS token is rate_limited: false
  if (res.status === 429) {
    const data = await res.json().catch(() => ({} as { retry_after_ms?: number })) as { retry_after_ms?: number };
    await new Promise((r) => setTimeout(r, (data.retry_after_ms ?? 3000) + 200));
    res = await doInvite();
  }

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
 * Uses @iam-bot via MATRIX_AS_TOKEN when available, else MATRIX_ADMIN_TOKEN.
 * Matrix Client-Server API: POST /_matrix/client/v3/rooms/{roomId}/kick
 */
export async function kickFromRoom(
  roomMatrixId: string,
  matrixUserId: string,
  reason = "Removed from IAM group",
): Promise<void> {
  const { url, token, name } = cfg();
  const { authToken, userIdParam } = roomAuth(token, name);
  const endpoint = `${url}/_matrix/client/v3/rooms/${encodeURIComponent(roomMatrixId)}/kick${userIdParam}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
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
 * Uses @iam-bot via MATRIX_AS_TOKEN when available.
 */
async function getPowerLevels(
  url: string,
  authToken: string,
  userIdParam: string,
  roomMatrixId: string,
): Promise<Record<string, unknown>> {
  const endpoint =
    `${url}/_matrix/client/v3/rooms/${encodeURIComponent(roomMatrixId)}/state/m.room.power_levels${userIdParam}`;

  const res = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${authToken}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`getPowerLevels ${roomMatrixId}: ${res.status}: ${text}`);
  }

  return res.json() as Promise<Record<string, unknown>>;
}

/**
 * Sets a single user's power level in a room using GET → merge → PUT.
 * Uses @iam-bot via MATRIX_AS_TOKEN when available, else MATRIX_ADMIN_TOKEN.
 * This preserves all other users' power levels in the room.
 */
export async function setPowerLevel(
  roomMatrixId: string,
  matrixUserId: string,
  level: number,
): Promise<void> {
  const { url, token, name } = cfg();
  const { authToken, userIdParam } = roomAuth(token, name);

  // Step 1: GET current state
  const current = await getPowerLevels(url, authToken, userIdParam, roomMatrixId);

  // Step 2: Merge — update only this user, preserve everyone else
  const existingUsers = (current.users as Record<string, number>) ?? {};
  const merged = {
    ...current,
    users: { ...existingUsers, [matrixUserId]: level },
  };

  // Step 3: PUT updated state back
  const endpoint =
    `${url}/_matrix/client/v3/rooms/${encodeURIComponent(roomMatrixId)}/state/m.room.power_levels${userIdParam}`;

  const res = await fetch(endpoint, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${authToken}`,
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
