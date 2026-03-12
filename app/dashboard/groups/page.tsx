import { getServerSession } from "@ory/nextjs/app";
import { redirect } from "next/navigation";
import Link from "next/link";
import { listSubjectRelations } from "@/lib/services/keto.service";
import { prisma } from "@/lib/db";
import { getGroupMembers } from "@/lib/services/group.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Settings } from "lucide-react";

export default async function DashboardGroupsPage() {
  const session = await getServerSession();
  if (!session?.identity) redirect("/auth/login");

  const userId = session.identity.id;

  const [memberTuples, adminTuples] = await Promise.all([
    listSubjectRelations("Group", "members", userId),
    listSubjectRelations("Group", "admins", userId),
  ]);

  const memberGroupIds = new Set(memberTuples.map((t) => t.object));
  const adminGroupIds = new Set(adminTuples.map((t) => t.object));
  const allGroupIds = [...new Set([...memberGroupIds, ...adminGroupIds])];

  const dbGroups =
    allGroupIds.length > 0
      ? await prisma.group.findMany({
          where: { id: { in: allGroupIds } },
          orderBy: { createdAt: "desc" },
        })
      : [];

  const groups = await Promise.all(
    dbGroups.map(async (group) => {
      const members = await getGroupMembers(group.id);
      return {
        id: group.id,
        name: group.name,
        description: group.description || undefined,
        memberCount: members.length,
        isAdmin: adminGroupIds.has(group.id),
      };
    }),
  );

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Groups</h1>
        <p className="text-muted-foreground">Groups you belong to or manage.</p>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No groups yet</p>
            <p className="text-muted-foreground text-sm mt-1">
              You are not a member of any groups.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <Card key={group.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg leading-snug">
                    {group.name}
                  </CardTitle>
                  {group.isAdmin && (
                    <Badge variant="secondary" className="shrink-0">
                      Admin
                    </Badge>
                  )}
                </div>
                {group.description && (
                  <p className="text-sm text-muted-foreground">
                    {group.description}
                  </p>
                )}
              </CardHeader>
              <CardContent className="flex items-center justify-between pt-0 mt-auto">
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  {group.memberCount}{" "}
                  {group.memberCount === 1 ? "member" : "members"}
                </span>
                {group.isAdmin && (
                  <Link
                    href={`/dashboard/groups/${group.id}`}
                    className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <Settings className="w-4 h-4" />
                    Manage
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
