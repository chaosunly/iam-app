import { getServerSession } from "@ory/nextjs/app";
import { redirect } from "next/navigation";
import { isGlobalAdmin } from "@/lib/services/permission.service";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Users, Folder, Shield, Info } from "lucide-react";

export default async function GitlabAccessPage() {
  const session = await getServerSession();

  if (!session?.identity) {
    redirect("/auth/login");
  }

  const userId = session.identity.id;
  const hasAdminAccess = await isGlobalAdmin(userId);

  if (!hasAdminAccess) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-3xl font-bold">GitLab Access Management</h1>
        <p className="text-muted-foreground mt-1">
          Manage GitLab-style groups, projects, and role assignments
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Groups Card */}
        <Link href="/admin/gitlab/groups">
          <Card className="hover:border-blue-500 transition-colors cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Groups</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage GitLab groups
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Projects Card */}
        <Link href="/admin/gitlab/projects">
          <Card className="hover:border-green-500 transition-colors cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Folder className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Projects</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage GitLab projects
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Roles Card */}
        <Link href="/admin/gitlab/roles">
          <Card className="hover:border-purple-500 transition-colors cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Role Assignments</h3>
                  <p className="text-sm text-muted-foreground">
                    Assign and manage roles
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>About GitLab Access Management</AlertTitle>
        <AlertDescription>
          <div className="text-sm space-y-2 mt-1">
            <p>
              This module implements GitLab-style role-based access control with
              the following roles:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>
                <strong>Owner:</strong> Full control over resource
              </li>
              <li>
                <strong>Maintainer:</strong> Manage settings and members
              </li>
              <li>
                <strong>Developer:</strong> Push code, merge, deploy
              </li>
              <li>
                <strong>Reporter:</strong> Read repository and issues
              </li>
              <li>
                <strong>Guest:</strong> Minimal read access
              </li>
            </ul>
            <p className="mt-3">
              Permissions are managed through Ory Keto (Zanzibar-style
              authorization) with support for hierarchical inheritance from
              groups to projects.
            </p>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
