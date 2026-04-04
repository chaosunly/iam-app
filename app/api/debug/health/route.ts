/**
 * Health check endpoint — tests each backing service + auth pipeline individually.
 * Remove or restrict this endpoint after diagnosing production issues.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@ory/nextjs/app";

const KETO_READ_URL =
  process.env.ORY_KETO_READ_URL || "http://localhost:4466";
const KRATOS_ADMIN_URL =
  process.env.ORY_KRATOS_ADMIN_URL || "http://localhost:4434";
const DEFAULT_ORG_ID = process.env.DEFAULT_ORG_ID || "default-org";

async function checkKeto(namespace: string) {
  const params = new URLSearchParams({ namespace, page_size: "1" });
  const url = `${KETO_READ_URL}/relation-tuples?${params}`;
  const start = Date.now();
  try {
    const res = await fetch(url, { method: "GET" });
    const body = await res.text();
    return {
      url,
      status: res.status,
      ok: res.ok,
      latencyMs: Date.now() - start,
      body: body.slice(0, 300),
    };
  } catch (err) {
    return {
      url,
      status: null,
      ok: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function checkKetoPermission(
  namespace: string,
  object: string,
  relation: string,
  subjectId: string,
) {
  const url = `${KETO_READ_URL}/relation-tuples/check`;
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ namespace, object, relation, subject_id: subjectId }),
    });
    const body = await res.text();
    let allowed: boolean | null = null;
    try {
      allowed = JSON.parse(body).allowed ?? null;
    } catch {}
    return {
      check: `${namespace}:${object}#${relation}@${subjectId.slice(0, 8)}...`,
      status: res.status,
      allowed,
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    return {
      check: `${namespace}:${object}#${relation}@${subjectId.slice(0, 8)}...`,
      status: null,
      allowed: null,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function checkKratos() {
  const url = `${KRATOS_ADMIN_URL}/admin/identities?page=0&per_page=1`;
  const start = Date.now();
  try {
    const res = await fetch(url, { method: "GET" });
    const body = await res.text();
    return {
      url,
      status: res.status,
      ok: res.ok,
      latencyMs: Date.now() - start,
      body: body.slice(0, 200),
    };
  } catch (err) {
    return {
      url,
      status: null,
      ok: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function GET(request: NextRequest) {
  // 1. Test session (same code path as requireAuth)
  let sessionInfo: Record<string, unknown> = { ok: false };
  let userId: string | null = null;
  try {
    const session = await getServerSession();
    if (session?.identity?.id) {
      userId = session.identity.id;
      sessionInfo = {
        ok: true,
        userId,
        email: (session.identity.traits as Record<string, unknown>)?.email ?? null,
      };
    } else {
      sessionInfo = { ok: false, reason: "no session or identity" };
    }
  } catch (err) {
    sessionInfo = {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // 2. Test Keto namespace availability
  const [ketoGlobalRole, ketoOrganization, ketoGroup] = await Promise.all([
    checkKeto("GlobalRole"),
    checkKeto("Organization"),
    checkKeto("Group"),
  ]);

  // 3. Test Kratos admin API
  const kratosAdmin = await checkKratos();

  // 4. If we have a userId, check their org admin permissions
  let permissionChecks: Record<string, unknown>[] = [];
  if (userId) {
    const [isGlobalAdmin, isOrgOwner, isOrgAdmin] = await Promise.all([
      checkKetoPermission("GlobalRole", "admin", "is_admin", userId),
      checkKetoPermission("Organization", DEFAULT_ORG_ID, "owners", userId),
      checkKetoPermission("Organization", DEFAULT_ORG_ID, "admins", userId),
    ]);
    permissionChecks = [isGlobalAdmin, isOrgOwner, isOrgAdmin];
  }

  // 5. Probe /api/admin/identities end-to-end (same session cookie, internal request)
  let identitiesProbe: Record<string, unknown> = { skipped: true };
  try {
    const origin = request.nextUrl.origin;
    const cookie = request.headers.get("cookie") ?? "";
    const start = Date.now();
    const res = await fetch(`${origin}/api/admin/identities?per_page=1`, {
      method: "GET",
      headers: { cookie },
    });
    const body = await res.text();
    identitiesProbe = {
      status: res.status,
      ok: res.ok,
      latencyMs: Date.now() - start,
      body: body.slice(0, 400),
    };
  } catch (err) {
    identitiesProbe = {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  return NextResponse.json({
    env: {
      ORY_KETO_READ_URL: KETO_READ_URL,
      ORY_KRATOS_ADMIN_URL: KRATOS_ADMIN_URL,
      // @ory/nextjs checks NEXT_PUBLIC_ORY_SDK_URL first, then ORY_SDK_URL
      NEXT_PUBLIC_ORY_SDK_URL: process.env.NEXT_PUBLIC_ORY_SDK_URL || "NOT SET",
      ORY_SDK_URL: process.env.ORY_SDK_URL || "NOT SET",
      DEFAULT_ORG_ID,
      NODE_ENV: process.env.NODE_ENV,
    },
    session: sessionInfo,
    keto: {
      namespaces: { GlobalRole: ketoGlobalRole, Organization: ketoOrganization, Group: ketoGroup },
    },
    kratos: { admin: kratosAdmin },
    permissionChecks,
    identitiesProbe,
    note: "Remove or secure this endpoint after diagnosis.",
  });
}
