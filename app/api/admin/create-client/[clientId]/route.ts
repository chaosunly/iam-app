import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@ory/nextjs/app";
import { isGlobalAdmin } from "@/lib/services/permission.service";

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
