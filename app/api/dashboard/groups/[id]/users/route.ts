import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@ory/nextjs/app";
import { isGlobalAdmin, isGroupAdmin } from "@/lib/services/permission.service";
import { listIdentities } from "@/lib/services/kratos.service";
import { getGroupMembers } from "@/lib/services/group.service";
import { withErrorHandler, UnauthorizedError, ForbiddenError } from "@/lib/errors";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withErrorHandler(async () => {
    const session = await getServerSession();
    if (!session?.identity) throw new UnauthorizedError();

    const userId = session.identity.id;
    const { id: groupId } = await params;

    const [globalAdmin, groupAdmin] = await Promise.all([
      isGlobalAdmin(userId),
      isGroupAdmin(userId, groupId),
    ]);

    if (!globalAdmin && !groupAdmin) throw new ForbiddenError();

    const [identities, memberIds] = await Promise.all([
      listIdentities(0, 250),
      getGroupMembers(groupId),
    ]);

    const memberIdSet = new Set(memberIds);
    const available = identities.filter((id) => !memberIdSet.has(id.id));

    return NextResponse.json({ users: available });
  });
}
