import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@ory/nextjs/app";
import { canAccessAdmin, isGroupAdmin } from "@/lib/services/permission.service";
import {
  deleteGroup,
  getGroupById,
  updateGroup,
} from "@/lib/services/group.service";

/**
 * GET /api/admin/groups/[id]
 * Get group details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession();
    if (!session?.identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.identity.id;
    const { id: groupId } = await params;
    const [globalAdmin, groupAdmin] = await Promise.all([
      canAccessAdmin(userId),
      isGroupAdmin(userId, groupId),
    ]);

    if (!globalAdmin && !groupAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch group metadata from database
    const group = await getGroupById(groupId);

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    return NextResponse.json(group);
  } catch (error) {
    console.error("Error fetching group:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/groups/[id]
 * Delete a group
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession();
    if (!session?.identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.identity.id;
    const { id: groupId } = await params;
    const [globalAdmin, groupAdmin] = await Promise.all([
      canAccessAdmin(userId),
      isGroupAdmin(userId, groupId),
    ]);

    if (!globalAdmin && !groupAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await deleteGroup(groupId, userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting group:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete group",
      },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/admin/groups/[id]
 * Update group name / description — accessible to global admins and group admins
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession();
    if (!session?.identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.identity.id;
    const { id: groupId } = await params;
    const [globalAdmin, groupAdmin] = await Promise.all([
      canAccessAdmin(userId),
      isGroupAdmin(userId, groupId),
    ]);

    if (!globalAdmin && !groupAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name && description === undefined) {
      return NextResponse.json(
        { error: "At least one of name or description is required" },
        { status: 400 },
      );
    }

    await updateGroup(groupId, { name, description }, userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating group:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update group",
      },
      { status: 500 },
    );
  }
}
