import { getSettingsFlow, OryPageParams } from "@ory/nextjs/app";
import { SettingsFlow } from "@ory/client-fetch";
import { redirect } from "next/navigation";
import config from "@/ory.config";
import { TotpForm } from "./_components/totp-form";

export const dynamic = "force-dynamic";

export default async function TotpSettingsPage(props: OryPageParams) {
  const searchParams = await props.searchParams;
  const params = searchParams.flow
    ? searchParams
    : { ...searchParams, return_to: "/dashboard/settings/totp" };
  const flow = await getSettingsFlow(config, params);

  if (!flow) {
    redirect("/dashboard/settings/totp");
  }

  return <TotpForm flow={flow as unknown as SettingsFlow} />;
}
