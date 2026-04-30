// app/admin/identities/page.tsx
import { listIdentities } from "@/lib/services/kratos.service";
import { IdentitiesList } from "./identities-list";

export const dynamic = "force-dynamic";

export default async function IdentitiesPage() {
  const identities = await listIdentities(0, 250);
  return <IdentitiesList identities={identities} />;
}
