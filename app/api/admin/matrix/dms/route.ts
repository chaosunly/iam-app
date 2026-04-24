import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandler } from "@/lib/errors";
import { requireAdmin } from "@/lib/middleware/auth.middleware";
import { validateBody } from "@/lib/middleware/validate";
import { listDms, createDm } from "@/lib/services/matrix-dm.service";

const createDmSchema = z.object({
  recipientId: z.string().min(1, "recipientId is required"),
});

export async function GET(request: NextRequest) {
  return withErrorHandler(async () => {
    const userContext = await requireAdmin(request);
    const dms = await listDms(userContext.userId);
    return NextResponse.json({ dms });
  });
}

export async function POST(request: NextRequest) {
  return withErrorHandler(async () => {
    const userContext = await requireAdmin(request);
    const body = await validateBody(request, createDmSchema);
    const dm = await createDm(userContext.userId, body.recipientId);
    return NextResponse.json({ dm }, { status: 201 });
  });
}
