import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandler, BadRequestError } from "@/lib/errors";
import { requireAdmin } from "@/lib/middleware/auth.middleware";
import { validateBody } from "@/lib/middleware/validate";
import { invalidateUserCache } from "@/lib/services/permission.service";
import {
  assignMatrixRole,
  updateMatrixRole,
  removeMatrixRole,
  getMatrixResourceMembers,
} from "@/lib/services/matrix.service";
import {
  syncMatrixRole,
  backgroundSyncMatrixRole,
} from "@/lib/services/matrix-sync.service";
import { logAdminAction } from "@/lib/services/audit.service";

const MATRIX_ROLES = ["matrix_admin", "moderator", "support", "member", "viewer"] as const;

const assignRoleSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  resourceType: z.enum(["org", "space", "room"]),
  resourceId: z.string().min(1, "resourceId is required"),
  role: z.enum(MATRIX_ROLES),
  matrixResourceId: z.string().optional(),
});

const updateRoleSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  resourceType: z.enum(["org", "space", "room"]),
  resourceId: z.string().min(1, "resourceId is required"),
  newRole: z.enum(MATRIX_ROLES),
  matrixResourceId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  return withErrorHandler(async () => {
    await requireAdmin(request);
    const searchParams = request.nextUrl.searchParams;
    const resourceType = searchParams.get("resourceType") as "org" | "space" | "room";
    const resourceId = searchParams.get("resourceId");
    if (!resourceType || !resourceId) {
      throw new BadRequestError("resourceType and resourceId are required");
    }
    const members = await getMatrixResourceMembers(resourceType, resourceId);
    return NextResponse.json({ members });
  });
}

export async function POST(request: NextRequest) {
  return withErrorHandler(async () => {
    const userContext = await requireAdmin(request);
    const body = await validateBody(request, assignRoleSchema);
    const { userId: targetUserId, resourceType, resourceId, role, matrixResourceId } = body;

    const assignment = await assignMatrixRole({ userId: targetUserId, resourceType, resourceId, role });
    invalidateUserCache(targetUserId);
    await logAdminAction(userContext.userId, "matrix_role_assigned", `MatrixRoleAssignment:${resourceType}:${resourceId}`, true, { targetUserId, role });

    const sync = await syncMatrixRole({
      action: "assign",
      actorUserId: userContext.userId,
      targetUserId,
      resourceType,
      resourceId,
      role,
      matrixResourceId,
    });

    return NextResponse.json({ assignment, sync }, { status: 201 });
  });
}

export async function PUT(request: NextRequest) {
  return withErrorHandler(async () => {
    const userContext = await requireAdmin(request);
    const body = await validateBody(request, updateRoleSchema);
    const { userId: targetUserId, resourceType, resourceId, newRole, matrixResourceId } = body;

    const assignment = await updateMatrixRole({ userId: targetUserId, resourceType, resourceId, newRole });
    invalidateUserCache(targetUserId);
    await logAdminAction(userContext.userId, "matrix_role_updated", `MatrixRoleAssignment:${resourceType}:${resourceId}`, true, { targetUserId, newRole });

    backgroundSyncMatrixRole({
      action: "update",
      actorUserId: userContext.userId,
      targetUserId,
      resourceType,
      resourceId,
      role: newRole,
      matrixResourceId,
    });

    return NextResponse.json({ assignment });
  });
}

export async function DELETE(request: NextRequest) {
  return withErrorHandler(async () => {
    const userContext = await requireAdmin(request);
    const body = await request.json();
    const { userId: targetUserId, resourceType, resourceId, matrixResourceId, role } = body;

    await removeMatrixRole({ userId: targetUserId, resourceType, resourceId });
    invalidateUserCache(targetUserId);
    await logAdminAction(userContext.userId, "matrix_role_revoked", `MatrixRoleAssignment:${resourceType}:${resourceId}`, true, { targetUserId });

    const sync = await syncMatrixRole({
      action: "revoke",
      actorUserId: userContext.userId,
      targetUserId,
      resourceType,
      resourceId,
      role: role ?? "member",
      matrixResourceId,
    });

    return NextResponse.json({ success: true, sync });
  });
}
