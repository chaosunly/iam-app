import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@ory/nextjs/app";
import { canAccessAdmin } from "@/lib/services/permission.service";
import {
  getGitlabProjects,
  createGitlabProject,
} from "@/lib/services/gitlab.service";

/**
 * GET /api/admin/gitlab/projects
 * List all GitLab projects
 */
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.identity.id;
    const hasAdminAccess = await canAccessAdmin(userId);

    if (!hasAdminAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const projects = await getGitlabProjects();
    return NextResponse.json({ projects });
  } catch (error) {
    console.error("Error fetching GitLab projects:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/gitlab/projects
 * Create a new GitLab project
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.identity.id;
    const hasAdminAccess = await canAccessAdmin(userId);

    if (!hasAdminAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, groupId } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 },
      );
    }

    const project = await createGitlabProject({ name, description, groupId });
    return NextResponse.json({ project }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating GitLab project:", error);

    if (error.statusCode === 409) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.statusCode || 500 },
    );
  }
}
