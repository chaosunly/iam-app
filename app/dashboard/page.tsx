import { getServerSession } from "@ory/nextjs/app";
import { redirect } from "next/navigation";
import { isGlobalAdmin } from "@/lib/services/permission.service";
import { getUserGroups } from "@/lib/services/group.service";
import { getDefaultOrganizationId, getUserRole } from "@/lib/services/organization.service";
import { autoProvisionUser } from "@/lib/services/auto-provision.service";
import { getUserGitlabRoles } from "@/lib/services/gitlab.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Mail, Users, Settings, Lock, Info } from "lucide-react";
import { UserOverviewCharts } from "@/components/charts/user-overview-charts";
import { ConnectedServices } from "@/components/dashboard/connected-services";

export default async function DashboardPage() {
  // Native OIDC (MSC3861): link to /#/login — Element auto-detects the single provider
  // and starts the PKCE flow immediately without showing a login button.
  // Nginx injects prompt=login on /authorize so MAS always re-checks Hydra
  // (current IAM session) instead of showing a cached wrong account.
  const elementBaseUrl = (
    process.env.NEXT_PUBLIC_ELEMENT_URL ||
    process.env.ELEMENT_URL ||
    ""
  ).replace(/\/$/, "");
  // Route through /element-logout so Element's localStorage is cleared before
  // starting a fresh SSO flow — otherwise switching IAM accounts still shows
  // the old Matrix account cached in localStorage.
  const elementSsoUrl = elementBaseUrl
    ? `${elementBaseUrl}/element-logout?next=${encodeURIComponent(elementBaseUrl + "/#/login")}`
    : "";

  // Get Kratos session (includes OIDC provider logins like SimpleLogin)
  const session = await getServerSession();

  if (!session || !session.identity) {
    redirect("/auth/login");
  }

  const user = session.identity;
  const userId = user.id;
  const email = user.traits.email || "No email";
  const name = user.traits.name?.first || user.traits.username || "User";

  // Auto-provision user if they don't have permissions yet
  await autoProvisionUser(userId);

  // Check if user is a global admin - redirect them to admin dashboard
  const hasAdminAccess = await isGlobalAdmin(userId);
  if (hasAdminAccess) {
    redirect("/admin");
  }

  // Get user's organization and groups
  const organizationId = getDefaultOrganizationId();
  const [userGroups, orgRole, gitlabRoles] = await Promise.all([
    getUserGroups(userId, organizationId),
    getUserRole(organizationId, userId),
    getUserGitlabRoles(userId),
  ]);

  return (
    <div className="flex flex-col h-full">
      {/* Main Content */}
      <div className="flex-1 p-6 md:p-8 overflow-auto">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Welcome back, {name}!</h2>
          <p className="text-muted-foreground">
            Here&apos;s what&apos;s happening with your account today.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Account Status
                </p>
                <p className="text-2xl font-bold">Active</p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground mb-1">Email</p>
                <p className="text-lg font-semibold truncate" title={email}>
                  {email}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Groups</p>
                <p className="text-2xl font-bold">{userGroups.length}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <UserOverviewCharts
          userGroups={userGroups.map((g) => ({ name: g.name, memberCount: g.memberCount ?? 0 }))}
          gitlabRoles={gitlabRoles.map((r) => ({ role: r.role, resourceType: r.resourceType }))}
          orgRole={orgRole ?? null}
        />

        {/* Groups Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>My Groups</CardTitle>
          </CardHeader>
          <CardContent>
            {userGroups.length > 0 ? (
              <div className="space-y-3">
                {userGroups.map((group) => (
                  <div
                    key={group.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium">{group.name}</p>
                        {group.description && (
                          <p className="text-sm text-muted-foreground">
                            {group.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {group.memberCount || 0} members
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                You are not a member of any groups yet.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Access & Permissions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Access &amp; Permissions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Global Roles</p>
              <p className="text-sm text-muted-foreground">None</p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Organization Roles</p>
              {orgRole ? (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    {orgRole}
                  </span>
                  <span className="text-sm text-muted-foreground">{organizationId}</span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">None</p>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Group Memberships</p>
              {userGroups.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {userGroups.map((group) => (
                    <span
                      key={group.id}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                    >
                      {group.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">None</p>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">GitLab Access</p>
              {gitlabRoles.length > 0 ? (
                <div className="space-y-2">
                  {gitlabRoles.map((assignment) => (
                    <div key={assignment.id} className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                        {assignment.role}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {assignment.resourceType}: {assignment.resourceId}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">None</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Connected Services */}
        <ConnectedServices elementSsoUrl={elementSsoUrl} />

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <a
                href="/auth/settings"
                className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent transition-colors"
              >
                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                  <Settings className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Account Settings</p>
                  <p className="text-sm text-muted-foreground">
                    Manage your profile
                  </p>
                </div>
              </a>

              <a
                href="/auth/settings?flow=password"
                className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent transition-colors"
              >
                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                  <Lock className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Change Password</p>
                  <p className="text-sm text-muted-foreground">
                    Update security
                  </p>
                </div>
              </a>

              <div className="flex items-center gap-3 p-4 rounded-lg border">
                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                  <Info className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Help &amp; Support</p>
                  <p className="text-sm text-muted-foreground">
                    Get assistance
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
