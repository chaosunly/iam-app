import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Folder, Shield } from "lucide-react";

export default function PermissionsPage() {
  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Permission Management</h2>
        <p className="text-muted-foreground">
          Manage access permissions across all services
        </p>
      </div>

      {/* GitLab Access Section */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-1">GitLab Access</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Manage GitLab-style groups, projects, and role assignments
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/admin/gitlab/groups">
            <Card className="hover:border-blue-500 transition-colors cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Groups</h4>
                    <p className="text-xs text-muted-foreground">
                      Manage GitLab groups
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/gitlab/projects">
            <Card className="hover:border-green-500 transition-colors cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Folder className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Projects</h4>
                    <p className="text-xs text-muted-foreground">
                      Manage GitLab projects
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/gitlab/roles">
            <Card className="hover:border-purple-500 transition-colors cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Role Assignments</h4>
                    <p className="text-xs text-muted-foreground">
                      Assign and manage roles
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
