import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/errors";
import { requireAdmin } from "@/lib/middleware/auth.middleware";
import { deleteDm } from "@/lib/services/matrix-dm.service";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withErrorHandler(async () => {
    const userContext = await requireAdmin(request);
    const { id } = await params;
    await deleteDm(id, userContext.userId);
    return NextResponse.json({ success: true });
  });
}
