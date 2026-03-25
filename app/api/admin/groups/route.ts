import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@ory/nextjs/app";
import { isGlobalAdmin } from "@/lib/services/permission.service";
import {
  getOrganizationGroups,
  createGroup,
} from "@/lib/services/group.service";
import { getDefaultOrganizationId } from "@/lib/services/organization.service";
import { backgroundBootstrapGroupRoom } from "@/lib/services/matrix-provision.service";

/**
 * GET /api/admin/groups
 * List all groups in the organization
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

    const organizationId = getDefaultOrganizationId();
    const groups = await getOrganizationGroups(organizationId);

    return NextResponse.json({ groups });
  } catch (error) {
    console.error("Error fetching groups:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/groups
 * Create a new group
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

    const organizationId = getDefaultOrganizationId();
    const group = await createGroup(
      organizationId,
      { name, description },
      userId,
    );

    backgroundBootstrapGroupRoom(group.id, group.name, group.organizationId);
    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    console.error("Error creating group:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create group",
      },
      { status: 500 },
    );
  }
}
