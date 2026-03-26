import { getSettingsFlow, OryPageParams } from "@ory/nextjs/app";
import { SettingsFlow } from "@ory/client-fetch";
import { redirect } from "next/navigation";
import config from "@/ory.config";
import { LookupSecretsForm } from "./_components/lookup-secrets-form";

export const dynamic = "force-dynamic";

export default async function LookupSecretsSettingsPage(props: OryPageParams) {
  const searchParams = await props.searchParams;
  const flow = await getSettingsFlow(config, searchParams);

  if (!flow) {
    redirect("/dashboard/settings/lookup-secrets");
  }

  return <LookupSecretsForm flow={flow as unknown as SettingsFlow} />;
}
