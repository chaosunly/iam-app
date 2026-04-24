import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandler, BadRequestError } from "@/lib/errors";
import { requireAdmin } from "@/lib/middleware/auth.middleware";
import { validateBody } from "@/lib/middleware/validate";
import {
  assignGitlabRole,
  updateGitlabRole,
  removeGitlabRole,
  getResourceMembers,
} from "@/lib/services/gitlab.service";

const GITLAB_ROLES = ["owner", "maintainer", "developer", "reporter", "guest"] as const;

const assignGitlabRoleSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  resourceType: z.enum(["group", "project"]),
  resourceId: z.string().min(1, "resourceId is required"),
  role: z.enum(GITLAB_ROLES),
});

const updateGitlabRoleSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  resourceType: z.enum(["group", "project"]),
  resourceId: z.string().min(1, "resourceId is required"),
  newRole: z.enum(GITLAB_ROLES),
});

export async function GET(request: NextRequest) {
  return withErrorHandler(async () => {
    await requireAdmin(request);
    const resourceType = request.nextUrl.searchParams.get("resourceType") as "group" | "project";
    const resourceId = request.nextUrl.searchParams.get("resourceId");
    if (!resourceType || !resourceId) {
      throw new BadRequestError("resourceType and resourceId are required");
    }
    const members = await getResourceMembers(resourceType, resourceId);
    return NextResponse.json({ members });
  });
}

export async function POST(request: NextRequest) {
  return withErrorHandler(async () => {
    await requireAdmin(request);
    const body = await validateBody(request, assignGitlabRoleSchema);
    const assignment = await assignGitlabRole({
      userId: body.userId,
      resourceType: body.resourceType,
      resourceId: body.resourceId,
      role: body.role,
    });
    return NextResponse.json({ assignment }, { status: 201 });
  });
}

export async function PUT(request: NextRequest) {
  return withErrorHandler(async () => {
    await requireAdmin(request);
    const body = await validateBody(request, updateGitlabRoleSchema);
    const assignment = await updateGitlabRole({
      userId: body.userId,
      resourceType: body.resourceType,
      resourceId: body.resourceId,
      newRole: body.newRole,
    });
    return NextResponse.json({ assignment });
  });
}

export async function DELETE(request: NextRequest) {
  return withErrorHandler(async () => {
    await requireAdmin(request);
    const body = await request.json();
    const { userId: targetUserId, resourceType, resourceId } = body;
    await removeGitlabRole({ userId: targetUserId, resourceType, resourceId });
    return NextResponse.json({ success: true });
  });
}
