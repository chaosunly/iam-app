import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@ory/nextjs/app";
import { isGlobalAdmin } from "@/lib/services/permission.service";
import { deleteGroup } from "@/lib/services/group.service";

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
    const hasAdminAccess = await isGlobalAdmin(userId);

    if (!hasAdminAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: groupId } = await params;

    // In a real implementation, fetch group metadata from database
    // For now, return basic structure
    const group = {
      id: groupId,
      name: groupId, // Replace with DB lookup
      description: "", // Replace with DB lookup
      memberCount: 0,
    };

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
    const hasAdminAccess = await isGlobalAdmin(userId);

    if (!hasAdminAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: groupId } = await params;
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
