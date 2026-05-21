import { getServerSession } from "@ory/nextjs/app";
import { redirect } from "next/navigation";
import { canAccessAdmin } from "@/lib/services/permission.service";
import { listIdentities } from "@/lib/services/kratos.service";
import { getOrganizationGroups } from "@/lib/services/group.service";
import { getDefaultOrganizationId } from "@/lib/services/organization.service";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Sparkles, ChevronRight } from "lucide-react";
import { AdminOverviewCharts } from "@/components/charts/admin-overview-charts";

export default async function AdminPage() {
  // Verify the user is authenticated
  const session = await getServerSession();

  if (!session || !session.identity) {
    redirect("/auth/login");
  }

  const userId = session.identity.id;
  const userName =
    session.identity.traits.name?.first ||
    session.identity.traits.username ||
    "Admin";

  // Double-check admin permissions
  const hasAdminAccess = await canAccessAdmin(userId);

  if (!hasAdminAccess) {
    redirect("/dashboard");
  }

  // Fetch statistics
  const identities = await listIdentities(0, 1000);
  const organizationId = getDefaultOrganizationId();
  const groups = await getOrganizationGroups(organizationId);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-6 md:p-8 overflow-auto">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Admin Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome {userName} - You have administrator access
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Total Identities
                </p>
                <p className="text-2xl font-bold">{identities.length}</p>
              </div>
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Total Groups
                </p>
                <p className="text-2xl font-bold">{groups.length}</p>
              </div>
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  System Status
                </p>
                <p className="text-2xl font-bold">Healthy</p>
              </div>
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <AdminOverviewCharts
          identities={identities.map((i) => ({ state: i.state }))}
          groups={groups.map((g) => ({ name: g.name, memberCount: g.memberCount ?? 0 }))}
        />

        {/* Groups Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Groups</CardTitle>
            <Button asChild variant="link" size="sm" className="text-sm">
              <Link href="/admin/groups">View All →</Link>
            </Button>
          </CardHeader>
          <div className="divide-y">
            {groups.length > 0 ? (
              groups.slice(0, 5).map((group) => (
                <Link
                  key={group.id}
                  href={`/admin/groups/${group.id}`}
                  className="p-6 flex items-center justify-between hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-medium">{group.name}</h3>
                      {group.description && (
                        <p className="text-sm text-muted-foreground">
                          {group.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      {group.memberCount}{" "}
                      {group.memberCount === 1 ? "member" : "members"}
                    </span>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-12 text-center">
                <p className="text-muted-foreground mb-4">
                  No groups created yet.
                </p>
                <Button asChild>
                  <Link href="/admin/groups/new">Create First Group</Link>
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
