import { getServerSession } from "@ory/nextjs/app";
import { redirect } from "next/navigation";
import { isGlobalAdmin } from "@/lib/services/permission.service";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Building2, Layers, Hash, Shield, Info, Zap } from "lucide-react";

export default async function MatrixAccessPage() {
  const session = await getServerSession();

  if (!session?.identity) {
    redirect("/auth/login");
  }

  const userId = session.identity.id;
  if (!(await isGlobalAdmin(userId))) {
    redirect("/dashboard");
  }

  const syncEnabled = process.env.MATRIX_ROLE_SYNC_ENABLED === "true";

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-3xl font-bold">Matrix Access Management</h1>
        <p className="text-muted-foreground mt-1">
          Manage Matrix orgs, spaces, rooms, and role assignments for Element staff
        </p>
      </div>

      {/* Sync status banner */}
      {syncEnabled ? (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 text-sm">
          <Zap className="h-4 w-4 shrink-0" />
          <span>
            <strong>Matrix sync is enabled.</strong> Role changes will be propagated to the
            Matrix homeserver automatically.
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200 text-sm">
          <Zap className="h-4 w-4 shrink-0" />
          <span>
            <strong>Matrix sync is disabled.</strong> IAM roles are stored and enforced here.
            Set{" "}
            <code className="font-mono text-xs bg-yellow-100 dark:bg-yellow-900/40 px-1 rounded">
              MATRIX_ROLE_SYNC_ENABLED=true
            </code>{" "}
            to push changes to the homeserver.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Orgs */}
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

        {/* Spaces */}
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

        {/* Rooms */}
        <Link href="/admin/matrix/rooms">
          <Card className="hover:border-violet-500 transition-colors cursor-pointer">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                  <Hash className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <h4 className="font-semibold">Rooms</h4>
                  <p className="text-xs text-muted-foreground">Individual Matrix rooms</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Role Assignments */}
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

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>About Matrix Access Management</AlertTitle>
        <AlertDescription>
          <div className="text-sm space-y-2 mt-1">
            <p>
              This module provides centralised RBAC for Element Matrix. Root Admin
              can manage all Matrix staff without entering the Element UI.
            </p>
            <p className="font-medium mt-2">Role hierarchy (org → space → room):</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>
                <strong>Matrix Admin:</strong> Full control — manage users, roles, spaces, rooms,
                view audit
              </li>
              <li>
                <strong>Moderator:</strong> Manage rooms and users within their space/room
              </li>
              <li>
                <strong>Support:</strong> Read-only access plus impersonation capability for
                support sessions
              </li>
              <li>
                <strong>Member:</strong> Regular participant
              </li>
              <li>
                <strong>Viewer:</strong> Read-only presence
              </li>
            </ul>
            <p className="mt-3">
              Permissions are stored in Ory Keto (Zanzibar-style). Roles assigned at the
              org level are inherited by spaces and rooms via{" "}
              <code className="font-mono text-xs bg-muted px-1 rounded">#parent</code> relation tuples.
            </p>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
