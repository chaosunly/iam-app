import { getServerSession } from "@ory/nextjs/app";
import { redirect } from "next/navigation";
import { canAccessAdmin } from "@/lib/services/permission.service";
import { getTalosHealthReady } from "@/lib/services/talos.service";
import { TalosKeyTable } from "./key-table";
import { Button } from "@/components/ui/button";
import Link from "next/link";

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

  let healthy = false;
  try {
    const h = await getTalosHealthReady();
    healthy = h.status === 200;
  } catch {
    healthy = false;
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Talos API Keys</h1>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                healthy
                  ? "bg-green-900/50 text-green-300"
                  : "bg-red-900/50 text-red-300"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  healthy ? "bg-green-400" : "bg-red-400"
                }`}
              />
              {healthy ? "Healthy" : "Unreachable"}
            </span>
          </div>
          <p className="text-muted-foreground mt-1">
            Manage service API keys issued by Talos
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/talos/keys/new">+ Create Key</Link>
        </Button>
      </div>

      <TalosKeyTable />
    </div>
  );
}
