// app/admin/identities/page.tsx
import { listIdentities } from "@/lib/services/kratos.service";
import { IdentitiesList } from "./identities-list";

export const dynamic = "force-dynamic";

export default async function IdentitiesPage() {
  // Loads up to 250 identities; server-side pagination is a future improvement
  const identities = await listIdentities(0, 250);
  return <IdentitiesList identities={identities} />;
}
