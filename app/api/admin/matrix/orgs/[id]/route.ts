import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@ory/nextjs/app";
import { isGlobalAdmin } from "@/lib/services/permission.service";
import {
  getMatrixOrgById,
  deleteMatrixOrg,
} from "@/lib/services/matrix.service";
import { logAdminAction } from "@/lib/services/audit.service";

/**
 * GET /api/admin/matrix/orgs/[id]
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession();
    if (!session?.identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await isGlobalAdmin(session.identity.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: orgId } = await params;
    const org = await getMatrixOrgById(orgId);
    if (!org) {
      return NextResponse.json(
        { error: "Matrix org not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ org });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.statusCode || 500 },
    );
  }
}

/**
 * DELETE /api/admin/matrix/orgs/[id]
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession();
    if (!session?.identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const actorId = session.identity.id;
    if (!(await isGlobalAdmin(actorId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: orgId } = await params;

    await deleteMatrixOrg(orgId);
    await logAdminAction(
      actorId,
      "matrix_org_deleted",
      `MatrixOrg:${orgId}`,
      true,
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.statusCode || 500 },
    );
  }
}
