import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@ory/nextjs/app";
import { isGlobalAdmin } from "@/lib/services/permission.service";
import {
  getGitlabProjectWithMembers,
  deleteGitlabProject,
} from "@/lib/services/gitlab.service";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/admin/gitlab/projects/[id]
 * Get GitLab project by ID with members
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
    const project = await getGitlabProjectWithMembers(id);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ project });
  } catch (error: unknown) {
    console.error("Error fetching GitLab project:", error);
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
 * DELETE /api/admin/gitlab/projects/[id]
 * Delete GitLab project
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
    await deleteGitlabProject(id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error deleting GitLab project:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const statusCode =
      error && typeof error === "object" && "statusCode" in error
        ? (error.statusCode as number)
        : 500;
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
