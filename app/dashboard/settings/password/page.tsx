import { getSettingsFlow, OryPageParams } from "@ory/nextjs/app";
import { SettingsFlow } from "@ory/client-fetch";
import { redirect } from "next/navigation";
import config from "@/ory.config";
import { PasswordForm } from "../_components/password-form";

export const dynamic = "force-dynamic";

export default async function PasswordSettingsPage(props: OryPageParams) {
  const searchParams = await props.searchParams;
  const flow = await getSettingsFlow(config, searchParams);

  if (!flow) {
    redirect("/dashboard/settings/password");
  }

  return <PasswordForm flow={flow as unknown as SettingsFlow} />;
}
