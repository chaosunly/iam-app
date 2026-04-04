/**
 * Health check endpoint — tests each backing service individually.
 * Remove or restrict this endpoint after diagnosing production issues.
 */

import { NextResponse } from "next/server";

const KETO_READ_URL =
  process.env.ORY_KETO_READ_URL || "http://localhost:4466";
const KRATOS_ADMIN_URL =
  process.env.ORY_KRATOS_ADMIN_URL || "http://localhost:4434";

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

async function checkKetoPermission() {
  const url = `${KETO_READ_URL}/relation-tuples/check`;
  const start = Date.now();
  try {
    // Deliberately check a non-existent tuple — Keto returns 403 {allowed:false}
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        namespace: "Organization",
        object: "health-check",
        relation: "members",
        subject_id: "health-check",
      }),
    });
    const body = await res.text();
    return {
      url,
      status: res.status,
      ok: res.status === 200 || res.status === 403,
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

export async function GET() {
  const [
    ketoGlobalRole,
    ketoOrganization,
    ketoGroup,
    ketoCheck,
    kratosAdmin,
  ] = await Promise.all([
    checkKeto("GlobalRole"),
    checkKeto("Organization"),
    checkKeto("Group"),
    checkKetoPermission(),
    checkKratos(),
  ]);

  return NextResponse.json({
    env: {
      ORY_KETO_READ_URL: KETO_READ_URL,
      ORY_KRATOS_ADMIN_URL: KRATOS_ADMIN_URL,
    },
    keto: {
      namespaces: {
        GlobalRole: ketoGlobalRole,
        Organization: ketoOrganization,
        Group: ketoGroup,
      },
      permissionCheck: ketoCheck,
    },
    kratos: {
      admin: kratosAdmin,
    },
    note: "Remove or secure this endpoint after diagnosis.",
  });
}
