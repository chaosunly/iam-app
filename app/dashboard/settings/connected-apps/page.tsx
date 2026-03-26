import { getSettingsFlow, OryPageParams } from "@ory/nextjs/app";
import { SettingsFlow } from "@ory/client-fetch";
import { redirect } from "next/navigation";
import config from "@/ory.config";
import { ConnectedApps } from "../_components/connected-apps";

export const dynamic = "force-dynamic";

export default async function ConnectedAppsSettingsPage(props: OryPageParams) {
  const searchParams = await props.searchParams;
  const params = searchParams.flow
    ? searchParams
    : { ...searchParams, return_to: "/dashboard/settings/connected-apps" };
  const flow = await getSettingsFlow(config, params);

  if (!flow) {
    redirect("/dashboard/settings/connected-apps");
  }

  return <ConnectedApps flow={flow as unknown as SettingsFlow} />;
}
