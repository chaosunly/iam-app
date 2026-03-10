import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@ory/nextjs/app";
import { isGlobalAdmin } from "@/lib/services/permission.service";
import {
  getGitlabGroupWithMembers,
  deleteGitlabGroup,
} from "@/lib/services/gitlab.service";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/admin/gitlab/groups/[id]
 * Get GitLab group by ID with members
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;
    const group = await getGitlabGroupWithMembers(id);

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    return NextResponse.json({ group });
  } catch (error: unknown) {
    console.error("Error fetching GitLab group:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const statusCode =
      error && typeof error === "object" && "statusCode" in error
        ? (error.statusCode as number)
        : 500;
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}

/**
 * DELETE /api/admin/gitlab/groups/[id]
 * Delete GitLab group
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;
    await deleteGitlabGroup(id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error deleting GitLab group:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const statusCode =
      error && typeof error === "object" && "statusCode" in error
        ? (error.statusCode as number)
        : 500;
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
