import { getServerSession } from "@ory/nextjs/app";
import { redirect } from "next/navigation";
import Link from "next/link";
import { isGlobalAdmin } from "@/lib/services/permission.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteClientButton } from "../delete-client-button";

type OAuth2Client = {
  client_id?: string;
  client_name?: string;
  client_secret_expires_at?: number;
  grant_types?: string[];
  response_types?: string[];
  scope?: string;
  redirect_uris?: string[];
  token_endpoint_auth_method?: string;
  skip_consent?: boolean;
  created_at?: string;
  updated_at?: string;
};

async function getClientById(clientId: string): Promise<OAuth2Client> {
  const hydraAdminUrl =
    process.env.HYDRA_ADMIN_URL || "http://hydra.railway.internal:4445";

  const response = await fetch(
    `${hydraAdminUrl}/admin/clients/${encodeURIComponent(clientId)}`,
    {
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to load OAuth2 client '${clientId}'`);
  }

  return (await response.json()) as OAuth2Client;
}

export default async function AdminClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession();

  if (!session?.identity) {
    redirect("/auth/login");
  }

  const hasAdminAccess = await isGlobalAdmin(session.identity.id);
  if (!hasAdminAccess) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const clientId = decodeURIComponent(id);
  const client = await getClientById(clientId);

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Client Details</h1>
          <p className="text-muted-foreground mt-1">
            Inspect OAuth2 client configuration.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/client">Back</Link>
          </Button>
          {client.client_id && <DeleteClientButton clientId={client.client_id} />}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{client.client_name || client.client_id || "Client"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <DetailRow label="Client ID" value={client.client_id} mono />
          <DetailRow
            label="Token Auth Method"
            value={client.token_endpoint_auth_method}
            mono
          />
          <DetailRow label="Scope" value={client.scope} mono />
          <DetailRow
            label="Grant Types"
            value={(client.grant_types || []).join(", ")}
            mono
          />
          <DetailRow
            label="Response Types"
            value={(client.response_types || []).join(", ")}
            mono
          />
          <DetailRow
            label="Skip Consent"
            value={client.skip_consent ? "true" : "false"}
          />
          <DetailRow
            label="Secret Expires At"
            value={
              client.client_secret_expires_at
                ? new Date(client.client_secret_expires_at * 1000).toISOString()
                : "never"
            }
            mono
          />
          <DetailRow label="Created At" value={client.created_at} mono />
          <DetailRow label="Updated At" value={client.updated_at} mono />

          <div className="space-y-2">
            <p className="font-medium">Redirect URIs</p>
            {(client.redirect_uris || []).length === 0 ? (
              <p className="text-muted-foreground">-</p>
            ) : (
              <ul className="space-y-1">
                {(client.redirect_uris || []).map((uri) => (
                  <li
                    key={uri}
                    className="rounded border bg-muted/30 px-2 py-1 font-mono text-xs break-all"
                  >
                    {uri}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value?: string;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4">
      <p className="font-medium">{label}</p>
      <p
        className={`md:col-span-2 ${mono ? "font-mono text-xs break-all" : ""}`}
      >
        {value || "-"}
      </p>
    </div>
  );
}
