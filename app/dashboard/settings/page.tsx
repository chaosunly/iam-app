import { getSettingsFlow, OryPageParams } from "@ory/nextjs/app";
import { SettingsFlow, UiText } from "@ory/client-fetch";
import { redirect } from "next/navigation";
import config from "@/ory.config";
import { ProfileForm } from "./_components/profile-form";
import { PasswordForm } from "./_components/password-form";
import { TotpForm } from "./totp/_components/totp-form";
import { LookupSecretsForm } from "./lookup-secrets/_components/lookup-secrets-form";
import { SecurityKeysForm } from "./security-keys/_components/security-keys-form";
import { PasskeysForm } from "./passkeys/_components/passkeys-form";
import { ConnectedApps } from "./_components/connected-apps";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

export const dynamic = "force-dynamic";

function FlowMessages({ messages }: { messages: UiText[] }) {
  if (!messages.length) return null;
  return (
    <div className="space-y-2">
      {messages.map((msg, i) => {
        const isError = msg.type === "error";
        const isSuccess = msg.type === "success";
        const Icon = isError ? AlertCircle : isSuccess ? CheckCircle2 : Info;
        const className = isError
          ? "border-destructive/50 text-destructive"
          : isSuccess
          ? "border-green-500/50 text-green-700 dark:text-green-400"
          : "";
        return (
          <Alert key={i} className={className}>
            <Icon className="h-4 w-4" />
            <AlertDescription>{msg.text}</AlertDescription>
          </Alert>
        );
      })}
    </div>
  );
}

export default async function SettingsPage(props: OryPageParams) {
  const searchParams = await props.searchParams;
  const params = searchParams.flow
    ? searchParams
    : { ...searchParams, return_to: "/dashboard/settings" };
  const flow = await getSettingsFlow(config, params);

  if (!flow) {
    redirect("/dashboard/settings");
  }

  const typedFlow = flow as unknown as SettingsFlow;
  // Strip global messages from the flow passed to each section so the same
  // error does not repeat in every section form. Render them once at the top.
  const sectionFlow = {
    ...typedFlow,
    ui: { ...typedFlow.ui, messages: [] },
  } as SettingsFlow;

  return (
    <div className="space-y-10">
      <FlowMessages messages={typedFlow.ui.messages ?? []} />
      <ProfileForm flow={sectionFlow} />
      <PasswordForm flow={sectionFlow} />
      <TotpForm flow={sectionFlow} />
      <LookupSecretsForm flow={sectionFlow} />
      <SecurityKeysForm flow={sectionFlow} />
      <PasskeysForm flow={sectionFlow} />
      <ConnectedApps flow={sectionFlow} />
    </div>
  );
}
