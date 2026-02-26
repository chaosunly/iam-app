import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@ory/nextjs/app";
import { isGlobalAdmin } from "@/lib/services/permission.service";
import { removeUserFromGroup } from "@/lib/services/group.service";

/**
 * DELETE /api/admin/groups/[id]/members/[userId]
 * Remove a member from a group
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } },
) {
  try {
    const session = await getServerSession();
    if (!session?.identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminId = session.identity.id;
    const hasAdminAccess = await isGlobalAdmin(adminId);

    if (!hasAdminAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: groupId, userId } = params;
    await removeUserFromGroup(groupId, userId, adminId);

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
