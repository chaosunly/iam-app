import { getSettingsFlow, OryPageParams } from "@ory/nextjs/app";
import { redirect } from "next/navigation";
import { SettingsFlow } from "@ory/client-fetch";
import config from "@/ory.config";
import { SettingsClient } from "./settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage(props: OryPageParams) {
  const searchParams = await props.searchParams;

  // Get return_to from search params
  const returnTo = searchParams.return_to;

  // Pass return_to to the settings flow if it exists
  const flowParams = returnTo
    ? { ...searchParams, return_to: returnTo }
    : searchParams;

  const flow = await getSettingsFlow(config, flowParams);

  // If flow doesn't exist, redirect to create a new flow with return_to
  if (!flow) {
    const params = new URLSearchParams();
    if (returnTo) {
      params.set("return_to", returnTo as string);
    }
    redirect(
      `/auth/settings${params.toString() ? `?${params.toString()}` : ""}`,
    );
  }

  // Type assertion needed due to version conflicts between @ory packages
  return (
    <SettingsClient flow={flow as unknown as SettingsFlow} config={config} />
  );
}
