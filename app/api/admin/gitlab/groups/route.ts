import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@ory/nextjs/app";
import { isGlobalAdmin } from "@/lib/services/permission.service";
import {
  getGitlabGroups,
  createGitlabGroup,
} from "@/lib/services/gitlab.service";

/**
 * GET /api/admin/gitlab/groups
 * List all GitLab groups
 */
export async function GET() {
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

    const groups = await getGitlabGroups();
    return NextResponse.json({ groups });
  } catch (error) {
    console.error("Error fetching GitLab groups:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/gitlab/groups
 * Create a new GitLab group
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
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Group name is required" },
        { status: 400 },
      );
    }

    const group = await createGitlabGroup({ name, description });
    return NextResponse.json({ group }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating GitLab group:", error);

    if (error.statusCode === 409) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.statusCode || 500 },
    );
  }
}
