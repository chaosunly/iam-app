import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler, NotFoundError } from "@/lib/errors";
import { requireAdmin } from "@/lib/middleware/auth.middleware";
import {
  getMatrixOrgById,
  deleteMatrixOrg,
} from "@/lib/services/matrix.service";
import { logAdminAction } from "@/lib/services/audit.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withErrorHandler(async () => {
    await requireAdmin(request);
    const { id: orgId } = await params;
    const org = await getMatrixOrgById(orgId);
    if (!org) throw new NotFoundError("Matrix org not found");
    return NextResponse.json({ org });
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withErrorHandler(async () => {
    const userContext = await requireAdmin(request);
    const { id: orgId } = await params;
    await deleteMatrixOrg(orgId);
    await logAdminAction(userContext.userId, "matrix_org_deleted", `MatrixOrg:${orgId}`, true);
    return NextResponse.json({ success: true });
  });
}
