import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@ory/nextjs/app";
import { randomBytes } from "node:crypto";
import { isGlobalAdmin } from "@/lib/services/permission.service";

type CreateClientPayload = {
  client_id?: string;
  client_name?: string;
  client_secret?: string;
  redirect_uris?: string[];
  grant_types?: string[];
  response_types?: string[];
  scope?: string;
  token_endpoint_auth_method?: "client_secret_post" | "client_secret_basic" | "none";
  skip_consent?: boolean;
};

async function ensureAdmin() {
  const session = await getServerSession();
  if (!session?.identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.identity.id;
  const hasAdminAccess = await isGlobalAdmin(userId);
  if (!hasAdminAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}

function getHydraAdminUrl() {
  return process.env.HYDRA_ADMIN_URL || "http://hydra.railway.internal:4445";
}

export async function GET() {
  try {
    const authError = await ensureAdmin();
    if (authError) {
      return authError;
    }

    const hydraResponse = await fetch(`${getHydraAdminUrl()}/admin/clients`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const text = await hydraResponse.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text };
    }

    if (!hydraResponse.ok) {
      return NextResponse.json(
        {
          error: "Failed to list OAuth2 clients",
          details: json,
        },
        { status: hydraResponse.status },
      );
    }

    return NextResponse.json({
      clients: Array.isArray(json) ? json : [],
    });
  } catch (error) {
    console.error("Error listing Hydra clients:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authError = await ensureAdmin();
    if (authError) {
      return authError;
    }

    const body = (await request.json()) as CreateClientPayload;

    const clientId = (body.client_id || "").trim();
    if (!clientId) {
      return NextResponse.json(
        { error: "client_id is required" },
        { status: 400 },
      );
    }

    const redirectUris = (body.redirect_uris || []).filter(Boolean);
    if (!redirectUris.length) {
      return NextResponse.json(
        { error: "At least one redirect URI is required" },
        { status: 400 },
      );
    }

    const clientSecret = body.client_secret?.trim() || randomBytes(24).toString("hex");

    const hydraAdminUrl = getHydraAdminUrl();

    const payload = {
      client_id: clientId,
      client_name: (body.client_name || clientId).trim(),
      client_secret: clientSecret,
      grant_types: body.grant_types?.length
        ? body.grant_types
        : ["authorization_code", "refresh_token"],
      response_types: body.response_types?.length ? body.response_types : ["code"],
      scope: (body.scope || "openid offline_access email profile").trim(),
      redirect_uris: redirectUris,
      token_endpoint_auth_method: body.token_endpoint_auth_method || "client_secret_post",
      skip_consent: body.skip_consent ?? true,
    };

    const hydraResponse = await fetch(`${hydraAdminUrl}/admin/clients`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await hydraResponse.text();
    let json: Record<string, unknown> | null = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text };
    }

    if (!hydraResponse.ok) {
      const errorObj = (json?.error as Record<string, unknown> | undefined) ||
        undefined;
      const message =
        (errorObj?.message as string | undefined) ||
        (errorObj?.reason as string | undefined) ||
        (json?.error as string | undefined) ||
        "Failed to create OAuth2 client";
      return NextResponse.json(
        {
          error: message,
          details: json,
        },
        { status: hydraResponse.status },
      );
    }

    return NextResponse.json(
      {
        success: true,
        client: json,
        credentials: {
          client_id: (json?.client_id as string | undefined) || clientId,
          client_secret: clientSecret,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating Hydra client:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
