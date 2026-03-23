import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@ory/nextjs/app";
import { isGlobalAdmin } from "@/lib/services/permission.service";
import {
  getMatrixRoomById,
  deleteMatrixRoom,
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
    if (!(await isGlobalAdmin(session.identity.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: roomId } = await params;
    const room = await getMatrixRoomById(roomId);
    if (!room) {
      return NextResponse.json(
        { error: "Matrix room not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ room });
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
    if (!(await isGlobalAdmin(actorId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: roomId } = await params;

    await deleteMatrixRoom(roomId);
    await logAdminAction(
      actorId,
      "matrix_room_deleted",
      `MatrixRoom:${roomId}`,
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
