import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@ory/nextjs/app";
import {
  canAccessAdmin,
  isGroupAdmin,
  invalidateUserCache,
} from "@/lib/services/permission.service";
import { removeUserFromGroup } from "@/lib/services/group.service";
import { backgroundSyncGroupRoomLeave } from "@/lib/services/matrix-provision.service";

/**
 * DELETE /api/admin/groups/[id]/members/[userId]
 * Remove a member from a group
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  try {
    const session = await getServerSession();
    if (!session?.identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminId = session.identity.id;
    const { id: groupId, userId } = await params;
    const [globalAdmin, groupAdmin] = await Promise.all([
      canAccessAdmin(adminId),
      isGroupAdmin(adminId, groupId),
    ]);

    if (!globalAdmin && !groupAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await removeUserFromGroup(groupId, userId, adminId);
    invalidateUserCache(userId);
    backgroundSyncGroupRoomLeave(groupId, userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing member from group:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to remove member from group",
      },
      { status: 500 },
    );
  }
}
