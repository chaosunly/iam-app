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
 *   MATRIX_ADMIN_TOKEN     Synapse admin access token (compat token from MAS)
 *   MATRIX_SERVER_NAME     e.g. matrix.acme.corp
 *
 * When Synapse uses MAS (MSC3861), user registration must go through MAS:
 *   MAS_PUBLIC_URL         e.g. https://mas.acme.corp
 *   MAS_IAM_SERVICE_SECRET client_secret for the "iam-service" MAS client
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

function serverName(): string {
  const name = process.env.MATRIX_SERVER_NAME;
  if (!name) throw new Error("MATRIX_SERVER_NAME must be set");
  return name;
}

// ── MAS (Matrix Authentication Service) ──────────────────────────────────────

function isMasConfigured(): boolean {
  return !!(process.env.MAS_PUBLIC_URL && process.env.MAS_IAM_SERVICE_SECRET);
}

/**
 * Fetches a short-lived MAS admin token via OAuth2 client credentials.
 * Requires "iam-service" client registered in MAS config.yaml.
 */
async function getMasAdminToken(): Promise<string> {
  const masUrl = process.env.MAS_PUBLIC_URL!;
  const secret = process.env.MAS_IAM_SERVICE_SECRET!;
  const clientId = process.env.MAS_IAM_CLIENT_ID ?? "01KNRNTFN95DG8ABA0WDGQTW0W";
  const creds    = Buffer.from(`${clientId}:${secret}`).toString("base64");

  const res = await fetch(`${masUrl}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${creds}`,
    },
    body: "grant_type=client_credentials&scope=urn%3Amas%3Aadmin",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MAS token request failed ${res.status}: ${text}`);
  }

  const { access_token } = await res.json() as { access_token: string };
  return access_token;
}

/**
 * Creates a Matrix user in MAS via the admin GraphQL API.
 * MAS then provisions the user to Synapse on first use.
 * Idempotent — MAS returns the existing user if username already exists.
 */
async function registerMatrixUserViaMas(
  iamUserId: string,
): Promise<{ matrixUserId: string }> {
  const masUrl  = process.env.MAS_PUBLIC_URL!;
  const name    = serverName();
  const username = toMatrixLocalpart(iamUserId); // "iam-<uuid>"
  const token   = await getMasAdminToken();

  const res = await fetch(`${masUrl}/graphql`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `
        mutation CreateUser($username: String!) {
          createUser(input: { username: $username, skipPasswordCheck: true }) {
            user { id username }
          }
        }
      `,
      variables: { username },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MAS createUser failed ${res.status}: ${text}`);
  }

  const data = await res.json() as {
    data?: { createUser?: { user?: { id: string; username: string } } };
    errors?: { message: string }[];
  };

  if (data.errors?.length) {
    throw new Error(`MAS createUser error: ${data.errors.map(e => e.message).join(", ")}`);
  }

  return { matrixUserId: `@${username}:${name}` };
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
 * Registers (or updates) a Matrix user.
 *
 * When MAS_PUBLIC_URL + MAS_IAM_SERVICE_SECRET are set (MSC3861 deployments),
 * uses the MAS admin GraphQL API — compat tokens cannot access Synapse admin API
 * in MSC3861 mode.
 *
 * Falls back to Synapse Admin API for non-MAS deployments.
 */
export async function registerMatrixUser(
  iamUserId: string,
  displayName: string,
  password: string,
): Promise<{ matrixUserId: string }> {
  if (isMasConfigured()) {
    return registerMatrixUserViaMas(iamUserId);
  }

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
