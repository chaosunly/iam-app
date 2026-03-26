import { getSettingsFlow, OryPageParams } from "@ory/nextjs/app";
import { SettingsFlow } from "@ory/client-fetch";
import { redirect } from "next/navigation";
import config from "@/ory.config";
import { ConnectedApps } from "../_components/connected-apps";

export const dynamic = "force-dynamic";

export default async function ConnectedAppsSettingsPage(props: OryPageParams) {
  const searchParams = await props.searchParams;
  const flow = await getSettingsFlow(config, searchParams);

  if (!flow) {
    redirect("/dashboard/settings/connected-apps");
  }

  return <ConnectedApps flow={flow as unknown as SettingsFlow} />;
}
