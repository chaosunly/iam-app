import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@ory/nextjs/app";
import { canAccessAdmin } from "@/lib/services/permission.service";

async function ensureAdmin() {
  const session = await getServerSession();
  if (!session?.identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.identity.id;
  const hasAdminAccess = await canAccessAdmin(userId);
  if (!hasAdminAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}

function getHydraAdminUrl() {
  return process.env.HYDRA_ADMIN_URL || "http://hydra.railway.internal:4445";
}

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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
) {
  try {
    const authError = await ensureAdmin();
    if (authError) {
      return authError;
    }

    const { clientId } = await params;
    const decodedClientId = decodeURIComponent(clientId);

    const hydraResponse = await fetch(
      `${getHydraAdminUrl()}/admin/clients/${encodeURIComponent(decodedClientId)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      },
    );

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
          error: "Failed to fetch OAuth2 client",
          details: json,
        },
        { status: hydraResponse.status },
      );
    }

    return NextResponse.json({ client: json });
  } catch (error) {
    console.error("Error fetching Hydra client:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
) {
  try {
    const authError = await ensureAdmin();
    if (authError) {
      return authError;
    }

    const { clientId } = await params;
    const decodedClientId = decodeURIComponent(clientId);

    const hydraResponse = await fetch(
      `${getHydraAdminUrl()}/admin/clients/${encodeURIComponent(decodedClientId)}`,
      {
        method: "DELETE",
      },
    );

    if (!hydraResponse.ok) {
      const text = await hydraResponse.text();
      let json: unknown = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = { raw: text };
      }

      return NextResponse.json(
        {
          error: "Failed to delete OAuth2 client",
          details: json,
        },
        { status: hydraResponse.status },
      );
    }

    return NextResponse.json({ success: true, client_id: decodedClientId });
  } catch (error) {
    console.error("Error deleting Hydra client:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
) {
  try {
    const authError = await ensureAdmin();
    if (authError) {
      return authError;
    }

    const { clientId } = await params;
    const decodedClientId = decodeURIComponent(clientId);
    const body = (await request.json()) as UpdateClientPayload;

    const hydraAdminUrl = getHydraAdminUrl();

    const updatePayload = {
      client_id: decodedClientId,
      client_name: (body.client_name || decodedClientId).trim(),
      redirect_uris: (body.redirect_uris || []).filter(Boolean),
      grant_types: body.grant_types?.length
        ? body.grant_types
        : ["authorization_code", "refresh_token"],
      response_types: body.response_types?.length ? body.response_types : ["code"],
      scope: (body.scope || "openid offline_access email profile").trim(),
      token_endpoint_auth_method: body.token_endpoint_auth_method || "client_secret_post",
      skip_consent: body.skip_consent ?? true,
    };

    const hydraResponse = await fetch(
      `${hydraAdminUrl}/admin/clients/${encodeURIComponent(decodedClientId)}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload),
      },
    );

    const updateText = await hydraResponse.text();
    let updateJson: Record<string, unknown> | null = null;
    try {
      updateJson = updateText ? JSON.parse(updateText) : null;
    } catch {
      updateJson = { raw: updateText };
    }

    if (!hydraResponse.ok) {
      return NextResponse.json(
        {
          error: "Failed to update OAuth2 client",
          details: updateJson,
        },
        { status: hydraResponse.status },
      );
    }

    const rotatedSecret = body.client_secret?.trim();
    if (rotatedSecret) {
      const rotateResponse = await fetch(
        `${hydraAdminUrl}/admin/clients/${encodeURIComponent(decodedClientId)}/rotate-secret`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ client_secret: rotatedSecret }),
        },
      );

      if (!rotateResponse.ok) {
        const rotateText = await rotateResponse.text();
        let rotateJson: unknown = null;
        try {
          rotateJson = rotateText ? JSON.parse(rotateText) : null;
        } catch {
          rotateJson = { raw: rotateText };
        }

        return NextResponse.json(
          {
            error: "Client updated but failed to rotate secret",
            details: rotateJson,
          },
          { status: rotateResponse.status },
        );
      }
    }

    return NextResponse.json({
      success: true,
      client: updateJson,
      credentials: rotatedSecret
        ? {
            client_id: decodedClientId,
            client_secret: rotatedSecret,
          }
        : null,
    });
  } catch (error) {
    console.error("Error updating Hydra client:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
