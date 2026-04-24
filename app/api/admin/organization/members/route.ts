import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "@ory/nextjs/app";
import { isGlobalAdmin, isOrgOwnerOrAdmin } from "@/lib/services/permission.service";
import { withErrorHandler, UnauthorizedError, ForbiddenError, BadRequestError } from "@/lib/errors";
import { validateBody } from "@/lib/middleware/validate";
import {
  getOrganizationMembers,
  addOrganizationMember,
  removeOrganizationMember,
  updateMemberRole,
  getDefaultOrganizationId,
} from "@/lib/services/organization.service";

const ORG_ROLES = ["owner", "admin", "member"] as const;

const memberSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  role: z.enum(ORG_ROLES),
});

async function requireOrgAdmin(userId: string, organizationId: string) {
  const hasAccess = (await isGlobalAdmin(userId)) || (await isOrgOwnerOrAdmin(userId, organizationId));
  if (!hasAccess) throw new ForbiddenError();
}

export async function GET() {
  return withErrorHandler(async () => {
    const session = await getServerSession();
    if (!session?.identity) throw new UnauthorizedError();
    const organizationId = getDefaultOrganizationId();
    await requireOrgAdmin(session.identity.id, organizationId);
    const members = await getOrganizationMembers(organizationId);
    return NextResponse.json({ members });
  });
}

export async function POST(request: NextRequest) {
  return withErrorHandler(async () => {
    const session = await getServerSession();
    if (!session?.identity) throw new UnauthorizedError();
    const organizationId = getDefaultOrganizationId();
    await requireOrgAdmin(session.identity.id, organizationId);
    const body = await validateBody(request, memberSchema);
    await addOrganizationMember(organizationId, body.userId, body.role, session.identity.id);
    return NextResponse.json({ success: true }, { status: 201 });
  });
}

export async function PATCH(request: NextRequest) {
  return withErrorHandler(async () => {
    const session = await getServerSession();
    if (!session?.identity) throw new UnauthorizedError();
    const organizationId = getDefaultOrganizationId();
    await requireOrgAdmin(session.identity.id, organizationId);
    const body = await validateBody(request, memberSchema);
    await updateMemberRole(organizationId, body.userId, body.role, session.identity.id);
    return NextResponse.json({ success: true });
  });
}

export async function DELETE(request: NextRequest) {
  return withErrorHandler(async () => {
    const session = await getServerSession();
    if (!session?.identity) throw new UnauthorizedError();
    const organizationId = getDefaultOrganizationId();
    await requireOrgAdmin(session.identity.id, organizationId);
    const userId = new URL(request.url).searchParams.get("userId");
    if (!userId) throw new BadRequestError("User ID is required");
    await removeOrganizationMember(organizationId, userId, session.identity.id);
    return NextResponse.json({ success: true });
  });
}
