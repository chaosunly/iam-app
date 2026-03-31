/**
 * Matrix Chat Launch Handler
 *
 * Flow:
 * 1. Verify Kratos session — redirect to login if not authenticated
 * 2. Extract username + email from Kratos identity traits
 * 3. (Optional) Call MAS admin API to check if the user already exists;
 *    create them proactively if not, so the SSO redirect lands immediately
 *    in Element rather than hitting a provisioning delay.
 *    Requires MAS_ADMIN_SECRET + MAS_INTERNAL_URL env vars.
 *    If those are absent the step is skipped — MAS auto-provisions the user
 *    on the first upstream OIDC callback from Hydra anyway.
 * 4. Redirect to /_matrix/client/v3/login/sso/redirect on the Matrix nginx,
 *    which triggers the full SSO chain:
 *    Matrix SSO → MAS → Hydra (silent re-auth via Kratos session) → id_token
 *    claims → MAS provisions/finds user → Matrix session → Element
 *
 * Env vars (set in Railway / .env):
 *   MATRIX_BASE_URL        Public base URL of the Matrix nginx  (e.g. https://nginx-sengly-branch.up.railway.app)
 *   NEXT_PUBLIC_ELEMENT_URL  Element Web public URL              (e.g. https://nginx-sengly-branch.up.railway.app)
 *   MAS_INTERNAL_URL       Internal URL of MAS                  (default: http://mas.railway.internal:8008)
 *   MAS_ADMIN_SECRET       MAS admin bearer token — optional, enables proactive provisioning
 *   AUTH_PUBLIC_URL        Public URL of this IAM app (for login redirect)
 *   NEXT_PUBLIC_APP_URL    Fallback public URL of this IAM app
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@ory/nextjs/app";

const MATRIX_BASE_URL = (process.env.MATRIX_BASE_URL || "").replace(/\/$/, "");
const ELEMENT_URL = (
  process.env.NEXT_PUBLIC_ELEMENT_URL ||
  process.env.ELEMENT_URL ||
  ""
).replace(/\/$/, "");
const MAS_INTERNAL_URL = (
  process.env.MAS_INTERNAL_URL || "http://mas.railway.internal:8008"
).replace(/\/$/, "");
const MAS_ADMIN_SECRET = process.env.MAS_ADMIN_SECRET || "";

/**
 * Check MAS for an existing user by localpart.
 * Returns the user id if found, null otherwise.
 */
async function getMasUser(localpart: string): Promise<string | null> {
  const res = await fetch(
    `${MAS_INTERNAL_URL}/api/admin/v1/users?filter[localpart]=${encodeURIComponent(localpart)}`,
    {
      headers: { Authorization: `Bearer ${MAS_ADMIN_SECRET}` },
    }
  );
  if (!res.ok) return null;
  const body = await res.json();
  const users: { id: string }[] = body?.data ?? [];
  return users.length > 0 ? users[0].id : null;
}

/**
 * Create a MAS user with the given localpart.
 */
async function createMasUser(localpart: string): Promise<void> {
  const res = await fetch(`${MAS_INTERNAL_URL}/api/admin/v1/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${MAS_ADMIN_SECRET}`,
    },
    body: JSON.stringify({ localpart }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`MAS create user failed (${res.status}): ${err}`);
  }
}

/**
 * Ensure the user exists in MAS. No-op if MAS_ADMIN_SECRET is not set.
 */
async function ensureMasUser(localpart: string, email: string): Promise<void> {
  if (!MAS_ADMIN_SECRET) {
    // MAS will auto-provision via upstream OIDC claims — nothing to do here
    return;
  }
  try {
    const existingId = await getMasUser(localpart);
    if (existingId) {
      console.info(`[matrix/launch] MAS user already exists: ${localpart} (id=${existingId})`);
      return;
    }
    console.info(`[matrix/launch] MAS user not found for localpart=${localpart} email=${email} — creating`);
    await createMasUser(localpart);
    console.info(`[matrix/launch] MAS user created: ${localpart}`);
  } catch (err) {
    // Best-effort — the upstream OIDC flow in MAS handles provisioning as a fallback
    console.warn("[matrix/launch] MAS pre-provisioning failed (will fall back to SSO provisioning):", err);
  }
}

export async function GET(request: NextRequest) {
  // 1. Verify Kratos session
  const session = await getServerSession();

  if (!session?.identity) {
    const appUrl = (
      process.env.AUTH_PUBLIC_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      request.nextUrl.origin
    ).replace(/\/$/, "");
    const returnTo = `${appUrl}/api/matrix/launch`;
    console.info("[matrix/launch] No session — redirecting to Kratos login", { returnTo });
    return NextResponse.redirect(
      `${appUrl}/.ory/self-service/login/browser?return_to=${encodeURIComponent(returnTo)}`
    );
  }

  // 2. Extract user info from Kratos identity
  const identity = session.identity;
  const email: string = identity.traits?.email ?? "";
  const username: string =
    identity.traits?.username ||
    identity.traits?.preferred_username ||
    (email ? email.split("@")[0] : identity.id);

  console.info("[matrix/launch] session ok", {
    userId: identity.id,
    username,
    email,
    hasMasSecret: Boolean(MAS_ADMIN_SECRET),
  });

  // 3. Check id_token claims (email + username) against MAS; create if missing
  await ensureMasUser(username, email);

  // 4. Redirect to Matrix SSO
  //    MAS handles the upstream Hydra OIDC flow and auto-provisions on the
  //    callback if the user wasn't pre-provisioned above.
  if (!MATRIX_BASE_URL) {
    console.error("[matrix/launch] MATRIX_BASE_URL is not configured");
    return NextResponse.json(
      { error: "MATRIX_BASE_URL is not configured on the IAM app" },
      { status: 500 }
    );
  }

  const elementRedirectUrl = ELEMENT_URL ? `${ELEMENT_URL}/` : `${MATRIX_BASE_URL}/`;
  const matrixSsoUrl = `${MATRIX_BASE_URL}/_matrix/client/v3/login/sso/redirect?redirectUrl=${encodeURIComponent(elementRedirectUrl)}`;

  console.info("[matrix/launch] redirecting to Matrix SSO", { matrixSsoUrl });
  return NextResponse.redirect(matrixSsoUrl);
}
