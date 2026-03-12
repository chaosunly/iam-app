import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@ory/nextjs/app";
import {
  isGlobalAdmin,
  isOrgOwnerOrAdmin,
} from "@/lib/services/permission.service";
import {
  getOrganizationMembers,
  addOrganizationMember,
  removeOrganizationMember,
  updateMemberRole,
  getDefaultOrganizationId,
} from "@/lib/services/organization.service";

/**
 * GET /api/admin/organization/members
 * List all members of the organization
 */
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.identity.id;
    const organizationId = getDefaultOrganizationId();
    const hasAccess =
      (await isGlobalAdmin(userId)) ||
      (await isOrgOwnerOrAdmin(userId, organizationId));

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const members = await getOrganizationMembers(organizationId);

    return NextResponse.json({ members });
  } catch (error) {
    console.error("Error fetching organization members:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/organization/members
 * Add a member to the organization
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const inviterId = session.identity.id;
    const organizationId = getDefaultOrganizationId();
    const hasAccess =
      (await isGlobalAdmin(inviterId)) ||
      (await isOrgOwnerOrAdmin(inviterId, organizationId));

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, role } = body;

    if (!userId || !role) {
      return NextResponse.json(
        { error: "User ID and role are required" },
        { status: 400 },
      );
    }

    if (!["owner", "admin", "member"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    await addOrganizationMember(organizationId, userId, role, inviterId);

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Error adding organization member:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to add member",
      },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/admin/organization/members
 * Update a member's role
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updaterId = session.identity.id;
    const organizationId = getDefaultOrganizationId();
    const hasAccess =
      (await isGlobalAdmin(updaterId)) ||
      (await isOrgOwnerOrAdmin(updaterId, organizationId));

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, role } = body;

    if (!userId || !role) {
      return NextResponse.json(
        { error: "User ID and role are required" },
        { status: 400 },
      );
    }

    if (!["owner", "admin", "member"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    await updateMemberRole(organizationId, userId, role, updaterId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating member role:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update member role",
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/organization/members
 * Remove a member from the organization
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const removerId = session.identity.id;
    const organizationId = getDefaultOrganizationId();
    const hasAccess =
      (await isGlobalAdmin(removerId)) ||
      (await isOrgOwnerOrAdmin(removerId, organizationId));

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
    }

    await removeOrganizationMember(organizationId, userId, removerId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing organization member:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to remove member",
      },
      { status: 500 },
    );
  }
}
