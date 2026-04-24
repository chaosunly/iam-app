import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "@ory/nextjs/app";
import { canAccessAdmin } from "@/lib/services/permission.service";
import { withErrorHandler, UnauthorizedError, ForbiddenError } from "@/lib/errors";
import { validateBody } from "@/lib/middleware/validate";
import {
  getOrganizationGroups,
  createGroup,
} from "@/lib/services/group.service";
import { getDefaultOrganizationId } from "@/lib/services/organization.service";
import { backgroundBootstrapGroupRoom } from "@/lib/services/matrix-provision.service";

const createGroupSchema = z.object({
  name: z.string().min(1, "Group name is required"),
  description: z.string().optional(),
});

export async function GET() {
  return withErrorHandler(async () => {
    const session = await getServerSession();
    if (!session?.identity) throw new UnauthorizedError();
    if (!(await canAccessAdmin(session.identity.id))) throw new ForbiddenError();

    const organizationId = getDefaultOrganizationId();
    const groups = await getOrganizationGroups(organizationId);
    return NextResponse.json({ groups });
  });
}

export async function POST(request: NextRequest) {
  return withErrorHandler(async () => {
    const session = await getServerSession();
    if (!session?.identity) throw new UnauthorizedError();
    const userId = session.identity.id;
    if (!(await canAccessAdmin(userId))) throw new ForbiddenError();

    const body = await validateBody(request, createGroupSchema);
    const organizationId = getDefaultOrganizationId();
    const group = await createGroup(organizationId, body, userId);

    backgroundBootstrapGroupRoom(group.id, group.name, group.organizationId);
    return NextResponse.json(group, { status: 201 });
  });
}
