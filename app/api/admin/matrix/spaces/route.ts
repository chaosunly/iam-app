import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@ory/nextjs/app";
import { isGlobalAdmin } from "@/lib/services/permission.service";
import { createMatrixSpace, getMatrixSpaces } from "@/lib/services/matrix.service";
import { logAdminAction } from "@/lib/services/audit.service";

/**
 * GET /api/admin/matrix/spaces?orgId=
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await isGlobalAdmin(session.identity.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const orgId = request.nextUrl.searchParams.get("orgId") ?? undefined;
    const spaces = await getMatrixSpaces(orgId);
    return NextResponse.json({ spaces });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.statusCode || 500 },
    );
  }
}

/**
 * POST /api/admin/matrix/spaces
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
    const { name, description, matrixId, orgId } = body;

    if (!name || !orgId) {
      return NextResponse.json(
        { error: "name and orgId are required" },
        { status: 400 },
      );
    }

    const space = await createMatrixSpace({ name, description, matrixId, orgId });
    await logAdminAction(actorId, "matrix_space_created", `MatrixSpace:${space.id}`, true, { name, orgId });

    return NextResponse.json({ space }, { status: 201 });
  } catch (error: any) {
    if (error.statusCode === 409) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.statusCode || 500 },
    );
  }
}
