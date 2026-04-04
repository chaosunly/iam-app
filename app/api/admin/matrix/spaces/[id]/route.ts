import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@ory/nextjs/app";
import { canAccessAdmin } from "@/lib/services/permission.service";
import {
  getMatrixSpaceById,
  deleteMatrixSpace,
} from "@/lib/services/matrix.service";
import { logAdminAction } from "@/lib/services/audit.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession();
    if (!session?.identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await canAccessAdmin(session.identity.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: spaceId } = await params;
    const space = await getMatrixSpaceById(spaceId);
    if (!space) {
      return NextResponse.json(
        { error: "Matrix space not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ space });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.statusCode || 500 },
    );
  }
}

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
    if (!(await canAccessAdmin(actorId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: spaceId } = await params;

    await deleteMatrixSpace(spaceId);
    await logAdminAction(
      actorId,
      "matrix_space_deleted",
      `MatrixSpace:${spaceId}`,
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
