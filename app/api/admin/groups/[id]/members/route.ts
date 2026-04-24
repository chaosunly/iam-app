import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "@ory/nextjs/app";
import {
  canAccessAdmin,
  isGroupAdmin,
  invalidateUserCache,
} from "@/lib/services/permission.service";
import { withErrorHandler, UnauthorizedError, ForbiddenError } from "@/lib/errors";
import { validateBody } from "@/lib/middleware/validate";
import { getGroupMembers, addUserToGroup } from "@/lib/services/group.service";
import { backgroundSyncGroupRoomJoin } from "@/lib/services/matrix-provision.service";
import { getIdentity } from "@/lib/services/kratos.service";

const addMemberSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  role: z.enum(["member", "moderator", "matrix_admin"]).optional().default("member"),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withErrorHandler(async () => {
    const session = await getServerSession();
    if (!session?.identity) throw new UnauthorizedError();
    const userId = session.identity.id;
    const { id: groupId } = await params;
    const [globalAdmin, groupAdmin] = await Promise.all([canAccessAdmin(userId), isGroupAdmin(userId, groupId)]);
    if (!globalAdmin && !groupAdmin) throw new ForbiddenError();

    const memberIds = await getGroupMembers(groupId);
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
        } catch {
          return { userId: memberId, email: "", name: memberId };
        }
      }),
    );
    return NextResponse.json({ members });
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withErrorHandler(async () => {
    const session = await getServerSession();
    if (!session?.identity) throw new UnauthorizedError();
    const adminId = session.identity.id;
    const { id: groupId } = await params;
    const [globalAdmin, groupAdmin] = await Promise.all([canAccessAdmin(adminId), isGroupAdmin(adminId, groupId)]);
    if (!globalAdmin && !groupAdmin) throw new ForbiddenError();

    const body = await validateBody(request, addMemberSchema);
    await addUserToGroup(groupId, body.userId, adminId);
    invalidateUserCache(body.userId);
    backgroundSyncGroupRoomJoin(groupId, body.userId, body.role);
    return NextResponse.json({ success: true });
  });
}
