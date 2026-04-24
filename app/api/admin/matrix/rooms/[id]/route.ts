import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandler, NotFoundError } from "@/lib/errors";
import { requireAdmin } from "@/lib/middleware/auth.middleware";
import { validateBody } from "@/lib/middleware/validate";
import {
  getMatrixRoomById,
  deleteMatrixRoom,
  updateMatrixRoom,
} from "@/lib/services/matrix.service";
import { logAdminAction } from "@/lib/services/audit.service";

const updateRoomSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withErrorHandler(async () => {
    await requireAdmin(request);
    const { id: roomId } = await params;
    const room = await getMatrixRoomById(roomId);
    if (!room) throw new NotFoundError("Matrix room not found");
    return NextResponse.json({ room });
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withErrorHandler(async () => {
    const userContext = await requireAdmin(request);
    const { id: roomId } = await params;
    await deleteMatrixRoom(roomId);
    await logAdminAction(userContext.userId, "matrix_room_deleted", `MatrixRoom:${roomId}`, true);
    return NextResponse.json({ success: true });
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withErrorHandler(async () => {
    const userContext = await requireAdmin(request);
    const { id: roomId } = await params;
    const body = await validateBody(request, updateRoomSchema);
    const room = await updateMatrixRoom(roomId, body);
    await logAdminAction(userContext.userId, "matrix_room_updated", `MatrixRoom:${roomId}`, true, { name: body.name });
    return NextResponse.json({ room });
  });
}
