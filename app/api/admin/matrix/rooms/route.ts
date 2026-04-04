import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@ory/nextjs/app";
import { canAccessAdmin } from "@/lib/services/permission.service";
import { createMatrixRoom, getMatrixRooms } from "@/lib/services/matrix.service";
import { logAdminAction } from "@/lib/services/audit.service";

/**
 * GET /api/admin/matrix/rooms?spaceId=
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await canAccessAdmin(session.identity.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const spaceId = request.nextUrl.searchParams.get("spaceId") ?? undefined;
    const rooms = await getMatrixRooms(spaceId);
    return NextResponse.json({ rooms });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.statusCode || 500 },
    );
  }
}

/**
 * POST /api/admin/matrix/rooms
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const actorId = session.identity.id;
    if (!(await canAccessAdmin(actorId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, matrixId, spaceId } = body;

    if (!name || !spaceId) {
      return NextResponse.json(
        { error: "name and spaceId are required" },
        { status: 400 },
      );
    }

    const room = await createMatrixRoom({ name, description, matrixId, spaceId });
    await logAdminAction(actorId, "matrix_room_created", `MatrixRoom:${room.id}`, true, { name, spaceId });

    return NextResponse.json({ room }, { status: 201 });
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
