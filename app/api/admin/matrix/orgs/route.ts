import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@ory/nextjs/app";
import { isGlobalAdmin } from "@/lib/services/permission.service";
import { createMatrixOrg, getMatrixOrgs } from "@/lib/services/matrix.service";
import { logAdminAction } from "@/lib/services/audit.service";

/**
 * GET /api/admin/matrix/orgs
 * List all Matrix orgs
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await isGlobalAdmin(session.identity.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const orgs = await getMatrixOrgs();
    return NextResponse.json({ orgs });
  } catch (error: any) {
    console.error("GET /api/admin/matrix/orgs error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.statusCode || 500 },
    );
  }
}

/**
 * POST /api/admin/matrix/orgs
 * Create a Matrix org
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const actorId = session.identity.id;
    if (!(await isGlobalAdmin(actorId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, homeserver } = body;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const org = await createMatrixOrg({ name, description, homeserver });
    await logAdminAction(actorId, "matrix_org_created", `MatrixOrg:${org.id}`, true, { name });

    return NextResponse.json({ org }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/admin/matrix/orgs error:", error);
    if (error.statusCode === 409) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.statusCode || 500 },
    );
  }
}
