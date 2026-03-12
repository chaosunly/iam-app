import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@ory/nextjs/app";
import { isGlobalAdmin, isGroupAdmin } from "@/lib/services/permission.service";
import { getGroupMembers, addUserToGroup } from "@/lib/services/group.service";
import { getIdentity } from "@/lib/services/kratos.service";

/**
 * GET /api/admin/groups/[id]/members
 * List all members of a group
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
      isGlobalAdmin(userId),
      isGroupAdmin(userId, groupId),
    ]);

    if (!globalAdmin && !groupAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const memberIds = await getGroupMembers(groupId);

    // Fetch user details from Kratos for each member
    const members = await Promise.all(
      memberIds.map(async (memberId) => {
        try {
          const identity = await getIdentity(memberId);
          return {
            userId: memberId,
            email: identity.traits.email || "",
            name: identity.traits.name
              ? `${identity.traits.name.first || ""} ${identity.traits.name.last || ""}`.trim()
              : identity.traits.email || memberId,
          };
        } catch (error) {
          console.error(`Failed to fetch identity for ${memberId}:`, error);
          // Return basic info if identity fetch fails
          return {
            userId: memberId,
            email: "",
            name: memberId,
          };
        }
      }),
    );

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
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession();
    if (!session?.identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminId = session.identity.id;
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 },
      );
    }

    const { id: groupId } = await params;
    const [globalAdmin, groupAdmin] = await Promise.all([
      isGlobalAdmin(adminId),
      isGroupAdmin(adminId, groupId),
    ]);

    if (!globalAdmin && !groupAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
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
