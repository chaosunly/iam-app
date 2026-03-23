import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@ory/nextjs/app";
import { isGlobalAdmin } from "@/lib/services/permission.service";
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

/**
 * GET /api/admin/matrix/roles?resourceType=&resourceId=
 * List role assignments for a resource
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await isGlobalAdmin(session.identity.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const resourceType = searchParams.get("resourceType") as "org" | "space" | "room";
    const resourceId = searchParams.get("resourceId");

    if (!resourceType || !resourceId) {
      return NextResponse.json(
        { error: "resourceType and resourceId are required" },
        { status: 400 },
      );
    }

    const members = await getMatrixResourceMembers(resourceType, resourceId);
    return NextResponse.json({ members });
  } catch (error: any) {
    console.error("GET /api/admin/matrix/roles error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.statusCode || 500 },
    );
  }
}

/**
 * POST /api/admin/matrix/roles
 * Assign a role to a user
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const actorId = session.identity.id;
    if (!(await isGlobalAdmin(actorId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { userId: targetUserId, resourceType, resourceId, role, matrixResourceId } = body;

    if (!targetUserId || !resourceType || !resourceId || !role) {
      return NextResponse.json(
        { error: "userId, resourceType, resourceId, and role are required" },
        { status: 400 },
      );
    }

    const assignment = await assignMatrixRole({
      userId: targetUserId,
      resourceType,
      resourceId,
      role,
    });

    // Invalidate permission cache for the target user
    invalidateUserCache(targetUserId);

    await logAdminAction(
      actorId,
      "matrix_role_assigned",
      `MatrixRoleAssignment:${resourceType}:${resourceId}`,
      true,
      { targetUserId, role },
    );

    // Sync to Matrix homeserver (result surfaced in response for UI feedback)
    const sync = await syncMatrixRole({
      action: "assign",
      actorUserId: actorId,
      targetUserId,
      resourceType,
      resourceId,
      role,
      matrixResourceId,
    });

    return NextResponse.json({ assignment, sync }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/admin/matrix/roles error:", error);
    if (error.statusCode === 409) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.statusCode || 500 },
    );
  }
}

/**
 * PUT /api/admin/matrix/roles
 * Update a user's role
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const actorId = session.identity.id;
    if (!(await isGlobalAdmin(actorId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { userId: targetUserId, resourceType, resourceId, newRole, matrixResourceId } = body;

    if (!targetUserId || !resourceType || !resourceId || !newRole) {
      return NextResponse.json(
        { error: "userId, resourceType, resourceId, and newRole are required" },
        { status: 400 },
      );
    }

    const assignment = await updateMatrixRole({
      userId: targetUserId,
      resourceType,
      resourceId,
      newRole,
    });

    invalidateUserCache(targetUserId);

    await logAdminAction(
      actorId,
      "matrix_role_updated",
      `MatrixRoleAssignment:${resourceType}:${resourceId}`,
      true,
      { targetUserId, newRole },
    );

    // Fire-and-forget for updates (don't block response)
    backgroundSyncMatrixRole({
      action: "update",
      actorUserId: actorId,
      targetUserId,
      resourceType,
      resourceId,
      role: newRole,
      matrixResourceId,
    });

    return NextResponse.json({ assignment });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.statusCode || 500 },
    );
  }
}

/**
 * DELETE /api/admin/matrix/roles
 * Remove a user's role
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const actorId = session.identity.id;
    if (!(await isGlobalAdmin(actorId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { userId: targetUserId, resourceType, resourceId, matrixResourceId, role } = body;

    if (!targetUserId || !resourceType || !resourceId) {
      return NextResponse.json(
        { error: "userId, resourceType, and resourceId are required" },
        { status: 400 },
      );
    }

    await removeMatrixRole({ userId: targetUserId, resourceType, resourceId });

    invalidateUserCache(targetUserId);

    await logAdminAction(
      actorId,
      "matrix_role_revoked",
      `MatrixRoleAssignment:${resourceType}:${resourceId}`,
      true,
      { targetUserId },
    );

    // Revocations are synced eagerly (security-sensitive)
    const sync = await syncMatrixRole({
      action: "revoke",
      actorUserId: actorId,
      targetUserId,
      resourceType,
      resourceId,
      role: role ?? "member",
      matrixResourceId,
    });

    return NextResponse.json({ success: true, sync });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.statusCode || 500 },
    );
  }
}
