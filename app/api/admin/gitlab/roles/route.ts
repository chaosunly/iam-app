import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@ory/nextjs/app";
import { isGlobalAdmin } from "@/lib/services/permission.service";
import {
  assignGitlabRole,
  updateGitlabRole,
  removeGitlabRole,
  getResourceMembers,
} from "@/lib/services/gitlab.service";

/**
 * GET /api/admin/gitlab/roles
 * Get role assignments for a resource
 * Query params: resourceType, resourceId
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.identity.id;
    const hasAdminAccess = await isGlobalAdmin(userId);

    if (!hasAdminAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const resourceType = searchParams.get("resourceType") as
      | "group"
      | "project";
    const resourceId = searchParams.get("resourceId");

    if (!resourceType || !resourceId) {
      return NextResponse.json(
        { error: "resourceType and resourceId are required" },
        { status: 400 },
      );
    }

    const members = await getResourceMembers(resourceType, resourceId);
    return NextResponse.json({ members });
  } catch (error: any) {
    console.error("Error fetching role assignments:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.statusCode || 500 },
    );
  }
}

/**
 * POST /api/admin/gitlab/roles
 * Assign a role to a user
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.identity.id;
    const hasAdminAccess = await isGlobalAdmin(userId);

    if (!hasAdminAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { userId: targetUserId, resourceType, resourceId, role } = body;

    if (!targetUserId || !resourceType || !resourceId || !role) {
      return NextResponse.json(
        { error: "userId, resourceType, resourceId, and role are required" },
        { status: 400 },
      );
    }

    const assignment = await assignGitlabRole({
      userId: targetUserId,
      resourceType,
      resourceId,
      role,
    });

    return NextResponse.json({ assignment }, { status: 201 });
  } catch (error: any) {
    console.error("Error assigning role:", error);

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
 * PUT /api/admin/gitlab/roles
 * Update a user's role
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.identity.id;
    const hasAdminAccess = await isGlobalAdmin(userId);

    if (!hasAdminAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { userId: targetUserId, resourceType, resourceId, newRole } = body;

    if (!targetUserId || !resourceType || !resourceId || !newRole) {
      return NextResponse.json(
        { error: "userId, resourceType, resourceId, and newRole are required" },
        { status: 400 },
      );
    }

    const assignment = await updateGitlabRole({
      userId: targetUserId,
      resourceType,
      resourceId,
      newRole,
    });

    return NextResponse.json({ assignment });
  } catch (error: any) {
    console.error("Error updating role:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.statusCode || 500 },
    );
  }
}

/**
 * DELETE /api/admin/gitlab/roles
 * Remove a user's role
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.identity.id;
    const hasAdminAccess = await isGlobalAdmin(userId);

    if (!hasAdminAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { userId: targetUserId, resourceType, resourceId } = body;

    if (!targetUserId || !resourceType || !resourceId) {
      return NextResponse.json(
        { error: "userId, resourceType, and resourceId are required" },
        { status: 400 },
      );
    }

    await removeGitlabRole({
      userId: targetUserId,
      resourceType,
      resourceId,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error removing role:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.statusCode || 500 },
    );
  }
}
