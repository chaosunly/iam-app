import { getSettingsFlow, OryPageParams } from "@ory/nextjs/app";
import { SettingsFlow } from "@ory/client-fetch";
import { redirect } from "next/navigation";
import config from "@/ory.config";
import { ProfileForm } from "../_components/profile-form";

export const dynamic = "force-dynamic";

export default async function ProfileSettingsPage(props: OryPageParams) {
  const searchParams = await props.searchParams;
  const flow = await getSettingsFlow(config, searchParams);

  if (!flow) {
    redirect("/dashboard/settings/profile");
  }

  return <ProfileForm flow={flow as unknown as SettingsFlow} />;
}
