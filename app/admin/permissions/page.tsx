import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Folder, Shield, Building2, Layers, Hash, Zap } from "lucide-react";

export default function PermissionsPage() {
  const matrixSyncEnabled = process.env.MATRIX_ROLE_SYNC_ENABLED === "true";

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
      <div className="mb-10">
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

      {/* Matrix Access Section */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h3 className="text-xl font-semibold">Matrix Access</h3>
          <span
            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
              matrixSyncEnabled
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
            }`}
          >
            <Zap className="w-3 h-3" />
            {matrixSyncEnabled ? "Sync on" : "Sync off"}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Manage Element Matrix organisations, spaces, rooms, and role assignments
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/admin/matrix/orgs">
            <Card className="hover:border-blue-500 transition-colors cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Orgs</h4>
                    <p className="text-xs text-muted-foreground">Matrix organisations</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/matrix/spaces">
            <Card className="hover:border-indigo-500 transition-colors cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                    <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Spaces</h4>
                    <p className="text-xs text-muted-foreground">Room collections</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/matrix/rooms">
            <Card className="hover:border-violet-500 transition-colors cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                    <Hash className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Rooms</h4>
                    <p className="text-xs text-muted-foreground">Individual rooms</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/matrix/roles">
            <Card className="hover:border-purple-500 transition-colors cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Role Assignments</h4>
                    <p className="text-xs text-muted-foreground">Assign and manage roles</p>
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
