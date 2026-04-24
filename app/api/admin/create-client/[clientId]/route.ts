import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/errors";
import { requireAdmin } from "@/lib/middleware/auth.middleware";

type UpdateClientPayload = {
  client_name?: string;
  redirect_uris?: string[];
  grant_types?: string[];
  response_types?: string[];
  scope?: string;
  token_endpoint_auth_method?: "client_secret_post" | "client_secret_basic" | "none";
  skip_consent?: boolean;
  client_secret?: string;
};

function getHydraAdminUrl() {
  return process.env.HYDRA_ADMIN_URL || "http://hydra.railway.internal:4445";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
) {
  return withErrorHandler(async (): Promise<NextResponse> => {
    await requireAdmin(request);
    const { clientId } = await params;
    const decodedClientId = decodeURIComponent(clientId);

    const hydraResponse = await fetch(
      `${getHydraAdminUrl()}/admin/clients/${encodeURIComponent(decodedClientId)}`,
      { method: "GET", headers: { "Content-Type": "application/json" }, cache: "no-store" },
    );

    const text = await hydraResponse.text();
    let json: unknown = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }

    if (!hydraResponse.ok) {
      return NextResponse.json({ error: "Failed to fetch OAuth2 client", details: json }, { status: hydraResponse.status });
    }

    return NextResponse.json({ client: json });
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
) {
  return withErrorHandler(async (): Promise<NextResponse> => {
    await requireAdmin(request);
    const { clientId } = await params;
    const decodedClientId = decodeURIComponent(clientId);

    const hydraResponse = await fetch(
      `${getHydraAdminUrl()}/admin/clients/${encodeURIComponent(decodedClientId)}`,
      { method: "DELETE" },
    );

    if (!hydraResponse.ok) {
      const text = await hydraResponse.text();
      let json: unknown = null;
      try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
      return NextResponse.json({ error: "Failed to delete OAuth2 client", details: json }, { status: hydraResponse.status });
    }

    return NextResponse.json({ success: true, client_id: decodedClientId });
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
) {
  return withErrorHandler(async (): Promise<NextResponse> => {
    await requireAdmin(request);
    const { clientId } = await params;
    const decodedClientId = decodeURIComponent(clientId);
    const body = (await request.json()) as UpdateClientPayload;
    const rotatedSecret = body.client_secret?.trim();

    const updatePayload = {
      client_id: decodedClientId,
      client_name: (body.client_name || decodedClientId).trim(),
      redirect_uris: (body.redirect_uris || []).filter(Boolean),
      grant_types: body.grant_types?.length ? body.grant_types : ["authorization_code", "refresh_token"],
      response_types: body.response_types?.length ? body.response_types : ["code"],
      scope: (body.scope || "openid offline_access email profile").trim(),
      token_endpoint_auth_method: body.token_endpoint_auth_method || "client_secret_post",
      skip_consent: body.skip_consent ?? true,
      ...(rotatedSecret ? { client_secret: rotatedSecret } : {}),
    };

    const hydraResponse = await fetch(
      `${getHydraAdminUrl()}/admin/clients/${encodeURIComponent(decodedClientId)}`,
      { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updatePayload) },
    );

    const updateText = await hydraResponse.text();
    let updateJson: Record<string, unknown> | null = null;
    try { updateJson = updateText ? JSON.parse(updateText) : null; } catch { updateJson = { raw: updateText }; }

    if (!hydraResponse.ok) {
      return NextResponse.json({ error: "Failed to update OAuth2 client", details: updateJson }, { status: hydraResponse.status });
    }

    return NextResponse.json({
      success: true,
      client: updateJson,
      credentials: rotatedSecret ? { client_id: decodedClientId, client_secret: rotatedSecret } : null,
    });
  });
}
