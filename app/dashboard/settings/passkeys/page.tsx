import { getSettingsFlow, OryPageParams } from "@ory/nextjs/app";
import { SettingsFlow } from "@ory/client-fetch";
import { redirect } from "next/navigation";
import config from "@/ory.config";
import { PasskeysForm } from "./_components/passkeys-form";

export const dynamic = "force-dynamic";

export default async function PasskeysSettingsPage(props: OryPageParams) {
  const searchParams = await props.searchParams;
  const flow = await getSettingsFlow(config, searchParams);

  if (!flow) {
    redirect("/dashboard/settings/passkeys");
  }

  return <PasskeysForm flow={flow as unknown as SettingsFlow} />;
}
