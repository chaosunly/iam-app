import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "@ory/nextjs/app";
import { canAccessAdmin, isGroupAdmin } from "@/lib/services/permission.service";
import { withErrorHandler, UnauthorizedError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { validateBody } from "@/lib/middleware/validate";
import {
  deleteGroup,
  getGroupById,
  getGroupMembers,
  updateGroup,
} from "@/lib/services/group.service";
import { syncGroupRoomLeave } from "@/lib/services/matrix-provision.service";
import { prisma } from "@/lib/db";

const updateGroupSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withErrorHandler(async () => {
    const session = await getServerSession();
    if (!session?.identity) throw new UnauthorizedError();
    const userId = session.identity.id;
    const { id: groupId } = await params;
    const [globalAdmin, groupAdmin] = await Promise.all([canAccessAdmin(userId), isGroupAdmin(userId, groupId)]);
    if (!globalAdmin && !groupAdmin) throw new ForbiddenError();

    const group = await getGroupById(groupId);
    if (!group) throw new NotFoundError("Group not found");
    return NextResponse.json(group);
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withErrorHandler(async () => {
    const session = await getServerSession();
    if (!session?.identity) throw new UnauthorizedError();
    const userId = session.identity.id;
    const { id: groupId } = await params;
    const [globalAdmin, groupAdmin] = await Promise.all([canAccessAdmin(userId), isGroupAdmin(userId, groupId)]);
    if (!globalAdmin && !groupAdmin) throw new ForbiddenError();

    // Kick all members from the Matrix room before deleting the DB record,
    // since syncGroupRoomLeave looks up the room by iamGroupId.
    const memberIds = await getGroupMembers(groupId);
    await Promise.allSettled(memberIds.map((memberId) => syncGroupRoomLeave(groupId, memberId)));
    await prisma.matrixRoom.deleteMany({ where: { iamGroupId: groupId } });

    await deleteGroup(groupId, userId);
    return NextResponse.json({ success: true });
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withErrorHandler(async () => {
    const session = await getServerSession();
    if (!session?.identity) throw new UnauthorizedError();
    const userId = session.identity.id;
    const { id: groupId } = await params;
    const [globalAdmin, groupAdmin] = await Promise.all([canAccessAdmin(userId), isGroupAdmin(userId, groupId)]);
    if (!globalAdmin && !groupAdmin) throw new ForbiddenError();

    const body = await validateBody(request, updateGroupSchema);
    await updateGroup(groupId, body, userId);
    return NextResponse.json({ success: true });
  });
}
