import { getServerSession } from "@ory/nextjs/app";
import { redirect } from "next/navigation";
import { isGlobalAdmin } from "@/lib/services/permission.service";
import { getOrganizationGroups } from "@/lib/services/group.service";
import { getDefaultOrganizationId } from "@/lib/services/organization.service";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, ChevronRight } from "lucide-react";

export default async function AdminGroupsPage() {
  const session = await getServerSession();

  if (!session?.identity) {
    redirect("/auth/login");
  }

  const userId = session.identity.id;
  const hasAdminAccess = await isGlobalAdmin(userId);

  if (!hasAdminAccess) {
    redirect("/dashboard");
  }

  // Get organization groups
  const organizationId = getDefaultOrganizationId();
  const groups = await getOrganizationGroups(organizationId);

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Groups</h1>
          <p className="text-muted-foreground mt-1">
            Manage organization groups and their members
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/groups/new">Create Group</Link>
        </Button>
      </div>

      <Card>
        {groups.length > 0 ? (
          <div className="divide-y">
            {groups.map((group) => (
              <Link
                key={group.id}
                href={`/admin/groups/${encodeURIComponent(group.id)}`}
                className="flex items-center justify-between p-6 hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{group.name}</h3>
                    {group.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {group.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    {group.memberCount || 0} members
                  </span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No groups yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first group to organize users
            </p>
            <Button asChild>
              <Link href="/admin/groups/new">Create Group</Link>
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
