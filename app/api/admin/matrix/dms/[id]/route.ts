import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@ory/nextjs/app";
import { canAccessAdmin } from "@/lib/services/permission.service";
import { deleteDm } from "@/lib/services/matrix-dm.service";
import { createErrorResponse } from "@/lib/errors";

export async function DELETE(
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
    const { id } = await params;
    await deleteDm(id, session.identity.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return createErrorResponse(error);
  }
}
