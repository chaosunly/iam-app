import { getServerSession } from "@ory/nextjs/app";
import { redirect } from "next/navigation";
import { isGlobalAdmin } from "@/lib/services/permission.service";
import { ClientList } from "./client-list";

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

  return <ClientList clients={clients} />;
}
