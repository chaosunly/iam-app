import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandler } from "@/lib/errors";
import { requireAdmin } from "@/lib/middleware/auth.middleware";
import { validateBody } from "@/lib/middleware/validate";
import { createMatrixSpace, getMatrixSpaces } from "@/lib/services/matrix.service";
import { logAdminAction } from "@/lib/services/audit.service";

const createSpaceSchema = z.object({
  name: z.string().min(1, "name is required"),
  orgId: z.string().min(1, "orgId is required"),
  matrixId: z.string().optional(),
  description: z.string().optional(),
});

export async function GET(request: NextRequest) {
  return withErrorHandler(async () => {
    await requireAdmin(request);
    const orgId = request.nextUrl.searchParams.get("orgId") ?? undefined;
    const spaces = await getMatrixSpaces(orgId);
    return NextResponse.json({ spaces });
  });
}

export async function POST(request: NextRequest) {
  return withErrorHandler(async () => {
    const userContext = await requireAdmin(request);
    const body = await validateBody(request, createSpaceSchema);
    const space = await createMatrixSpace(body);
    await logAdminAction(userContext.userId, "matrix_space_created", `MatrixSpace:${space.id}`, true, { name: body.name, orgId: body.orgId });
    return NextResponse.json({ space }, { status: 201 });
  });
}
