import { getServerSession } from "@ory/nextjs/app";
import { redirect } from "next/navigation";
import { isGlobalAdmin } from "@/lib/services/permission.service";
import { getOrganizationGroups } from "@/lib/services/group.service";
import { getDefaultOrganizationId } from "@/lib/services/organization.service";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GroupList } from "./group-list";


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

      <GroupList groups={groups} />
    </div>
  );
}
