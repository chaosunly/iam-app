import { getServerSession } from "@ory/nextjs/app";
import { redirect } from "next/navigation";
import { canAccessAdmin } from "@/lib/services/permission.service";
import { getTalosHealthReady } from "@/lib/services/talos.service";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, KeyRound, Activity } from "lucide-react";

export default async function TalosAdminPage() {
  const session = await getServerSession();

  if (!session?.identity) {
    redirect("/auth/login");
  }

  const userId = session.identity.id;
  const hasAdminAccess = await canAccessAdmin(userId);
  if (!hasAdminAccess) {
    redirect("/dashboard");
  }

  let healthStatus = { status: 0, body: "" };
  try {
    const h = await getTalosHealthReady();
    healthStatus = { status: h.status, body: h.body };
  } catch (err) {
    healthStatus = { status: 0, body: (err as Error).message };
  }

  const talosAdminUrl =
    process.env.ORY_TALOS_ADMIN_URL || "http://localhost:4420";

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-3xl font-bold">Talos API Keys</h1>
        <p className="text-muted-foreground mt-1">
          Manage service API keys and inspect Talos health
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <a href="/api/admin/talos/health" target="_self">
          <Card className="hover:border-foreground/30 transition-colors cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-muted rounded-lg">
                  <Activity className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Health</h3>
                  <p className="text-sm text-muted-foreground">
                    Status: {healthStatus.status || "unreachable"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </a>

        <Link href={talosAdminUrl} target="_blank">
          <Card className="hover:border-foreground/30 transition-colors cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-muted rounded-lg">
                  <KeyRound className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Open Talos Admin</h3>
                  <p className="text-sm text-muted-foreground">
                    Open the Talos admin console in a new tab
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/talos" className="hidden" />
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>About Talos integration</AlertTitle>
        <AlertDescription>
          <div className="text-sm space-y-2 mt-1">
            <p>
              This section lets administrators inspect Talos health and open the
              Talos admin UI. Key issuance, rotation, and revocation can be
              performed through the Talos admin API which is proxied via the BFF
              at <strong>/api/admin/talos</strong>.
            </p>
            <p className="mt-3">
              Further UI actions (issue key, list keys) will be added next.
            </p>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
