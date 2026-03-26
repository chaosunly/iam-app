import { getSettingsFlow, OryPageParams } from "@ory/nextjs/app";
import { SettingsFlow } from "@ory/client-fetch";
import { redirect } from "next/navigation";
import config from "@/ory.config";
import { SecurityKeysForm } from "./_components/security-keys-form";

export const dynamic = "force-dynamic";

export default async function SecurityKeysSettingsPage(props: OryPageParams) {
  const searchParams = await props.searchParams;
  const flow = await getSettingsFlow(config, searchParams);

  if (!flow) {
    redirect("/dashboard/settings/security-keys");
  }

  return <SecurityKeysForm flow={flow as unknown as SettingsFlow} />;
}
