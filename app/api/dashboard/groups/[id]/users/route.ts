import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@ory/nextjs/app";
import { isGlobalAdmin, isGroupAdmin } from "@/lib/services/permission.service";
import { listIdentities } from "@/lib/services/kratos.service";
import { getGroupMembers } from "@/lib/services/group.service";

/**
 * GET /api/dashboard/groups/[id]/users
 * Returns all system users NOT already in the group.
 * Accessible to global admins and group admins of this specific group.
 */
export async function GET(
  _request: NextRequest,
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

    const [identities, memberIds] = await Promise.all([
      listIdentities(0, 250),
      getGroupMembers(groupId),
    ]);

    const memberIdSet = new Set(memberIds);
    const available = identities.filter((id) => !memberIdSet.has(id.id));

    return NextResponse.json({ users: available });
  } catch (error) {
    console.error("Error fetching available users for group:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
