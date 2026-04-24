import { getSettingsFlow, OryPageParams } from "@ory/nextjs/app";
import { SettingsFlow } from "@ory/client-fetch";
import config from "@/ory.config";
import { ProfileForm } from "./_components/profile-form";
import { PasswordForm } from "./_components/password-form";
import { TotpForm } from "./totp/_components/totp-form";
import { LookupSecretsForm } from "./lookup-secrets/_components/lookup-secrets-form";
import { SecurityKeysForm } from "./security-keys/_components/security-keys-form";
import { PasskeysForm } from "./passkeys/_components/passkeys-form";
import { ConnectedApps } from "./_components/connected-apps";

export const dynamic = "force-dynamic";

export default async function SettingsPage(props: OryPageParams) {
  const searchParams = await props.searchParams;
  const params = searchParams.flow
    ? searchParams
    : { ...searchParams, return_to: "/dashboard/settings" };
  const flow = await getSettingsFlow(config, params);

  if (!flow) {
    return null;
  }

  return (
    <div className="space-y-10">
      <ProfileForm flow={flow as unknown as SettingsFlow} />
      <PasswordForm flow={flow as unknown as SettingsFlow} />
      <TotpForm flow={flow as unknown as SettingsFlow} />
      <LookupSecretsForm flow={flow as unknown as SettingsFlow} />
      <SecurityKeysForm flow={flow as unknown as SettingsFlow} />
      <PasskeysForm flow={flow as unknown as SettingsFlow} />
      <ConnectedApps flow={flow as unknown as SettingsFlow} />
    </div>
  );
}
