import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@ory/nextjs/app";
import { canAccessAdmin } from "@/lib/services/permission.service";
import { listDms, createDm } from "@/lib/services/matrix-dm.service";
import { createErrorResponse } from "@/lib/errors";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await canAccessAdmin(session.identity.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const dms = await listDms(session.identity.id);
    return NextResponse.json({ dms });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await canAccessAdmin(session.identity.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { recipientId } = await request.json();
    const dm = await createDm(session.identity.id, recipientId);
    return NextResponse.json({ dm }, { status: 201 });
  } catch (error) {
    return createErrorResponse(error);
  }
}
