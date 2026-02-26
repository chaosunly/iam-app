import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@ory/nextjs/app";
import { isGlobalAdmin } from "@/lib/services/permission.service";
import { getGroupMembers, addUserToGroup } from "@/lib/services/group.service";

/**
 * GET /api/admin/groups/[id]/members
 * List all members of a group
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
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

    const groupId = params.id;
    const memberIds = await getGroupMembers(groupId);

    // In a real implementation, fetch user details from Kratos
    const members = memberIds.map((memberId) => ({
      userId: memberId,
      email: "", // Fetch from Kratos
      name: memberId, // Fetch from Kratos
    }));

    return NextResponse.json({ members });
  } catch (error) {
    console.error("Error fetching group members:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/groups/[id]/members
 * Add a member to a group
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
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

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
    }

    const groupId = params.id;
    await addUserToGroup(groupId, userId, adminId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error adding member to group:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to add member to group",
      },
      { status: 500 },
    );
  }
}
