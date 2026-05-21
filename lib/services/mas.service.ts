/**
 * MAS (Matrix Authentication Service) Admin API client.
 *
 * Uses client credentials (MAS_IAM_CLIENT_ID + MAS_IAM_SERVICE_SECRET) to
 * obtain an admin bearer token, then calls /api/admin/v0/ endpoints to
 * provision Matrix users without going through the AS token path (which
 * conflicts with MAS-managed accounts).
 */

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAdminToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 30_000) {
    return cachedToken.value;
  }

  const masUrl   = process.env.MAS_PUBLIC_URL;
  const clientId = process.env.MAS_IAM_CLIENT_ID;
  const secret   = process.env.MAS_IAM_SERVICE_SECRET;

  if (!masUrl || !clientId || !secret) {
    throw new Error("MAS_PUBLIC_URL, MAS_IAM_CLIENT_ID, MAS_IAM_SERVICE_SECRET must all be set");
  }

  const credentials = Buffer.from(`${clientId}:${secret}`).toString("base64");
  const res = await fetch(`${masUrl}/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=urn%3Amas%3Aadmin",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`MAS token request failed ${res.status}: ${body}`);
  }

  const json = await res.json();
  cachedToken = {
    value:     json.access_token,
    expiresAt: now + (json.expires_in ?? 3600) * 1000,
  };
  return cachedToken.value;
}

export interface MasUser {
  id:       string;
  username: string;
}

/**
 * Creates a MAS-managed user with the given Matrix localpart (= Kratos UUID).
 * MAS also provisions the corresponding Synapse account.
 * Returns the MAS user object, or null if creation is not supported/configured.
 */
export async function createMasUser(uuid: string): Promise<MasUser | null> {
  const masUrl = process.env.MAS_PUBLIC_URL;
  if (!masUrl || !process.env.MAS_IAM_CLIENT_ID || !process.env.MAS_IAM_SERVICE_SECRET) {
    return null;
  }

  try {
    const token = await getAdminToken();
    const res   = await fetch(`${masUrl}/api/admin/v0/users`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({ username: uuid, admin: false }),
    });

    if (res.status === 409) {
      // User already exists in MAS — fetch them instead
      const existing = await getMasUserByUsername(uuid);
      return existing;
    }

    if (!res.ok) {
      const body = await res.text();
      console.error(`[MAS] createMasUser failed ${res.status}: ${body}`);
      return null;
    }

    const json = await res.json();
    return { id: json.data?.id ?? json.id, username: uuid };
  } catch (err) {
    console.error("[MAS] createMasUser error:", err);
    return null;
  }
}

async function getMasUserByUsername(username: string): Promise<MasUser | null> {
  const masUrl = process.env.MAS_PUBLIC_URL;
  if (!masUrl) return null;

  try {
    const token = await getAdminToken();
    const res   = await fetch(
      `${masUrl}/api/admin/v0/users?filter[username]=${encodeURIComponent(username)}`,
      { headers: { "Authorization": `Bearer ${token}` } },
    );
    if (!res.ok) return null;
    const json = await res.json();
    const user = json.data?.[0];
    if (!user) return null;
    return { id: user.id, username: user.attributes?.username ?? username };
  } catch {
    return null;
  }
}
