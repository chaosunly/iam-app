import { OryPageParams } from "@ory/nextjs/app";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// Valid dashboard settings sections
const SETTINGS_SECTIONS = [
  "profile",
  "password",
  "totp",
  "lookup-secrets",
  "security-keys",
  "passkeys",
  "connected-apps",
  "general",
];

function resolveTargetSection(returnTo: string | string[] | undefined): string {
  if (!returnTo) return "profile";
  const path = Array.isArray(returnTo) ? returnTo[0] : returnTo;
  // Extract the section from a full path like /dashboard/settings/password
  const match = path.match(/\/dashboard\/settings\/([^/?#]+)/);
  if (match && SETTINGS_SECTIONS.includes(match[1])) {
    return match[1];
  }
  return "profile";
}

export default async function AuthSettingsPage(props: OryPageParams) {
  const searchParams = await props.searchParams;
  const flowId = searchParams.flow;
  const returnTo = searchParams.return_to;

  const section = resolveTargetSection(returnTo);
  const targetPath = `/dashboard/settings/${section}`;

  if (flowId) {
    const params = new URLSearchParams({ flow: flowId as string });
    redirect(`${targetPath}?${params.toString()}`);
  }

  redirect(targetPath);
}
