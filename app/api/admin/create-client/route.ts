import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { withErrorHandler, BadRequestError } from "@/lib/errors";
import { requireAdmin } from "@/lib/middleware/auth.middleware";

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

function getHydraAdminUrl() {
  return process.env.HYDRA_ADMIN_URL || "http://hydra.railway.internal:4445";
}

export async function GET(_req: NextRequest) {
  return withErrorHandler(async (): Promise<NextResponse> => {
    await requireAdmin(_req);

    const hydraResponse = await fetch(`${getHydraAdminUrl()}/admin/clients`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const text = await hydraResponse.text();
    let json: unknown = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }

    if (!hydraResponse.ok) {
      return NextResponse.json({ error: "Failed to list OAuth2 clients", details: json }, { status: hydraResponse.status });
    }

    return NextResponse.json({ clients: Array.isArray(json) ? json : [] });
  });
}

export async function POST(request: NextRequest) {
  return withErrorHandler(async (): Promise<NextResponse> => {
    await requireAdmin(request);

    const body = (await request.json()) as CreateClientPayload;
    const clientId = (body.client_id || "").trim();
    if (!clientId) throw new BadRequestError("client_id is required");

    const redirectUris = (body.redirect_uris || []).filter(Boolean);
    if (!redirectUris.length) throw new BadRequestError("At least one redirect URI is required");

    const clientSecret = body.client_secret?.trim() || randomBytes(24).toString("hex");

    const payload = {
      client_id: clientId,
      client_name: (body.client_name || clientId).trim(),
      client_secret: clientSecret,
      grant_types: body.grant_types?.length ? body.grant_types : ["authorization_code", "refresh_token"],
      response_types: body.response_types?.length ? body.response_types : ["code"],
      scope: (body.scope || "openid offline_access email profile").trim(),
      redirect_uris: redirectUris,
      token_endpoint_auth_method: body.token_endpoint_auth_method || "client_secret_post",
      skip_consent: body.skip_consent ?? true,
    };

    const hydraResponse = await fetch(`${getHydraAdminUrl()}/admin/clients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await hydraResponse.text();
    let json: Record<string, unknown> | null = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }

    if (!hydraResponse.ok) {
      const errorObj = (json?.error as Record<string, unknown> | undefined) || undefined;
      const message =
        (errorObj?.message as string | undefined) ||
        (errorObj?.reason as string | undefined) ||
        (json?.error as string | undefined) ||
        "Failed to create OAuth2 client";
      return NextResponse.json({ error: message, details: json }, { status: hydraResponse.status });
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
  });
}
