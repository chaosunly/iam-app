import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler, NotFoundError } from "@/lib/errors";
import { requireAdmin } from "@/lib/middleware/auth.middleware";
import {
  getMatrixSpaceById,
  deleteMatrixSpace,
} from "@/lib/services/matrix.service";
import { logAdminAction } from "@/lib/services/audit.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withErrorHandler(async () => {
    await requireAdmin(request);
    const { id: spaceId } = await params;
    const space = await getMatrixSpaceById(spaceId);
    if (!space) throw new NotFoundError("Matrix space not found");
    return NextResponse.json({ space });
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withErrorHandler(async () => {
    const userContext = await requireAdmin(request);
    const { id: spaceId } = await params;
    await deleteMatrixSpace(spaceId);
    await logAdminAction(userContext.userId, "matrix_space_deleted", `MatrixSpace:${spaceId}`, true);
    return NextResponse.json({ success: true });
  });
}
