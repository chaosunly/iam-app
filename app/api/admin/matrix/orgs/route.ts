import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandler } from "@/lib/errors";
import { requireAdmin } from "@/lib/middleware/auth.middleware";
import { validateBody } from "@/lib/middleware/validate";
import { createMatrixOrg, getMatrixOrgs } from "@/lib/services/matrix.service";
import { logAdminAction } from "@/lib/services/audit.service";

const createOrgSchema = z.object({
  name: z.string().min(1, "name is required"),
  description: z.string().optional(),
  homeserver: z.string().optional(),
});

export async function GET(_request: NextRequest) {
  return withErrorHandler(async () => {
    await requireAdmin(_request);
    const orgs = await getMatrixOrgs();
    return NextResponse.json({ orgs });
  });
}

export async function POST(request: NextRequest) {
  return withErrorHandler(async () => {
    const userContext = await requireAdmin(request);
    const body = await validateBody(request, createOrgSchema);
    const org = await createMatrixOrg(body);
    await logAdminAction(userContext.userId, "matrix_org_created", `MatrixOrg:${org.id}`, true, { name: body.name });
    return NextResponse.json({ org }, { status: 201 });
  });
}
