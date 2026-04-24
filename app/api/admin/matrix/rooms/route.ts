import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandler } from "@/lib/errors";
import { requireAdmin } from "@/lib/middleware/auth.middleware";
import { validateBody } from "@/lib/middleware/validate";
import { createMatrixRoom, getMatrixRooms } from "@/lib/services/matrix.service";
import { logAdminAction } from "@/lib/services/audit.service";

const createRoomSchema = z.object({
  name: z.string().min(1, "name is required"),
  spaceId: z.string().min(1, "spaceId is required"),
  matrixId: z.string().optional(),
  description: z.string().optional(),
});

export async function GET(request: NextRequest) {
  return withErrorHandler(async () => {
    await requireAdmin(request);
    const spaceId = request.nextUrl.searchParams.get("spaceId") ?? undefined;
    const rooms = await getMatrixRooms(spaceId);
    return NextResponse.json({ rooms });
  });
}

export async function POST(request: NextRequest) {
  return withErrorHandler(async () => {
    const userContext = await requireAdmin(request);
    const body = await validateBody(request, createRoomSchema);
    const room = await createMatrixRoom(body);
    await logAdminAction(userContext.userId, "matrix_room_created", `MatrixRoom:${room.id}`, true, { name: body.name, spaceId: body.spaceId });
    return NextResponse.json({ room }, { status: 201 });
  });
}
