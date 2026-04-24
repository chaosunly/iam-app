import { NextResponse } from "next/server";
import { getServerSession } from "@ory/nextjs/app";
import { withErrorHandler, UnauthorizedError } from "@/lib/errors";
import { listSubjectRelations } from "@/lib/services/keto.service";
import { prisma } from "@/lib/db";
import { getGroupMembers } from "@/lib/services/group.service";

export async function GET() {
  return withErrorHandler(async () => {
    const session = await getServerSession();
    if (!session?.identity) throw new UnauthorizedError();

    const userId = session.identity.id;

    const [memberTuples, adminTuples] = await Promise.all([
      listSubjectRelations("Group", "members", userId),
      listSubjectRelations("Group", "admins", userId),
    ]);

    const memberGroupIds = new Set(memberTuples.map((t) => t.object));
    const adminGroupIds = new Set(adminTuples.map((t) => t.object));
    const allGroupIds = [...new Set([...memberGroupIds, ...adminGroupIds])];

    if (allGroupIds.length === 0) {
      return NextResponse.json({ groups: [] });
    }

    const groups = await prisma.group.findMany({
      where: { id: { in: allGroupIds } },
      orderBy: { createdAt: "desc" },
    });

    const groupsWithMeta = await Promise.all(
      groups.map(async (group) => {
        const members = await getGroupMembers(group.id);
        return {
          id: group.id,
          name: group.name,
          description: group.description || undefined,
          organizationId: group.organizationId,
          memberCount: members.length,
          createdAt: group.createdAt,
          isAdmin: adminGroupIds.has(group.id),
          isMember: memberGroupIds.has(group.id),
        };
      }),
    );

    return NextResponse.json({ groups: groupsWithMeta });
  });
}
