import { getServerSession } from "@ory/nextjs/app";
import { redirect } from "next/navigation";
import Link from "next/link";
import { isGlobalAdmin } from "@/lib/services/permission.service";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KeyRound } from "lucide-react";

type OAuth2Client = {
  client_id?: string;
  client_name?: string;
  scope?: string;
  redirect_uris?: string[];
  grant_types?: string[];
  skip_consent?: boolean;
};

async function getClients(): Promise<OAuth2Client[]> {
  const hydraAdminUrl =
    process.env.HYDRA_ADMIN_URL || "http://hydra.railway.internal:4445";

  const response = await fetch(`${hydraAdminUrl}/admin/clients`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to load OAuth2 clients");
  }

  const data = (await response.json()) as OAuth2Client[];
  return Array.isArray(data) ? data : [];
}

export default async function AdminClientPage() {
  const session = await getServerSession();

  if (!session?.identity) {
    redirect("/auth/login");
  }

  const hasAdminAccess = await isGlobalAdmin(session.identity.id);
  if (!hasAdminAccess) {
    redirect("/dashboard");
  }

  const clients = await getClients();

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">OAuth2 Clients</h1>
          <p className="text-muted-foreground mt-1">
            Manage Hydra OAuth2 clients for IAM and integrated services.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/client/new">Create Client</Link>
        </Button>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Grant Types</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Redirect URIs</TableHead>
              <TableHead>Consent</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground py-12"
                >
                  <KeyRound className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
                  No OAuth2 clients found.
                </TableCell>
              </TableRow>
            ) : (
              clients.map((client) => (
                <TableRow key={client.client_id}>
                  <TableCell className="font-medium">
                    {client.client_id || "-"}
                  </TableCell>
                  <TableCell>{client.client_name || "-"}</TableCell>
                  <TableCell className="max-w-56 truncate" title={(client.grant_types || []).join(", ")}>
                    {(client.grant_types || []).join(", ") || "-"}
                  </TableCell>
                  <TableCell className="max-w-72 truncate" title={client.scope || ""}>
                    {client.scope || "-"}
                  </TableCell>
                  <TableCell className="max-w-80">
                    <div className="space-y-1">
                      {(client.redirect_uris || []).length === 0 && <span>-</span>}
                      {(client.redirect_uris || []).slice(0, 2).map((uri) => (
                        <p key={uri} className="truncate" title={uri}>
                          {uri}
                        </p>
                      ))}
                      {(client.redirect_uris || []).length > 2 && (
                        <p className="text-muted-foreground text-xs">
                          +{(client.redirect_uris || []).length - 2} more
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {client.skip_consent ? "Skip" : "Required"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
