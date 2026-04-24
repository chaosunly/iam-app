import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@ory/nextjs/app";
import {
  canAccessAdmin,
  isGroupAdmin,
  invalidateUserCache,
} from "@/lib/services/permission.service";
import { withErrorHandler, UnauthorizedError, ForbiddenError } from "@/lib/errors";
import { removeUserFromGroup } from "@/lib/services/group.service";
import { backgroundSyncGroupRoomLeave } from "@/lib/services/matrix-provision.service";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  return withErrorHandler(async () => {
    const session = await getServerSession();
    if (!session?.identity) throw new UnauthorizedError();
    const adminId = session.identity.id;
    const { id: groupId, userId } = await params;
    const [globalAdmin, groupAdmin] = await Promise.all([canAccessAdmin(adminId), isGroupAdmin(adminId, groupId)]);
    if (!globalAdmin && !groupAdmin) throw new ForbiddenError();

    await removeUserFromGroup(groupId, userId, adminId);
    invalidateUserCache(userId);
    backgroundSyncGroupRoomLeave(groupId, userId);
    return NextResponse.json({ success: true });
  });
}
