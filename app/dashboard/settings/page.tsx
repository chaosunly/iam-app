import { redirect } from "next/navigation";
import { getSettingsFlow } from "@ory/nextjs/app";
import config from "@/ory.config";

const SETTINGS_SECTIONS = [
  "general",
  "profile",
  "password",
  "totp",
  "lookup-secrets",
  "security-keys",
  "passkeys",
  "connected-apps",
];

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ flow?: string }>;
}) {
  const params = await searchParams;

  if (params.flow) {
    // Fetch the flow to check its return_to — after a successful settings
    // update, Kratos redirects here; if return_to points to a section, send
    // the user there instead of always defaulting to profile.
    const flow = await getSettingsFlow(config, params).catch(() => null);
    const returnTo = (flow as { return_to?: string } | null)?.return_to ?? "";
    const section = returnTo.split("/dashboard/settings/")[1]?.split("?")[0];

    if (section && SETTINGS_SECTIONS.includes(section)) {
      redirect(`/dashboard/settings/${section}?flow=${params.flow}`);
    }

    redirect(`/dashboard/settings/profile?flow=${params.flow}`);
  }

  redirect("/dashboard/settings/profile");
}
