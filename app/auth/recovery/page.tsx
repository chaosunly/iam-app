import { getRecoveryFlow, OryPageParams } from "@ory/nextjs/app";
import { redirect } from "next/navigation";
import config from "@/ory.config";
import { RecoveryClient } from "./recovery-client";

export const dynamic = "force-dynamic";

export default async function RecoveryPage(props: OryPageParams) {
  const searchParams = await props.searchParams;

  // Get return_to from search params
  const returnTo = searchParams.return_to;

  // Pass return_to to the recovery flow if it exists
  const flowParams = returnTo
    ? { ...searchParams, return_to: returnTo }
    : searchParams;

  const flow = await getRecoveryFlow(config, flowParams);

  // If flow doesn't exist, redirect to create a new flow with return_to
  if (!flow) {
    const params = new URLSearchParams();
    if (returnTo) {
      params.set("return_to", returnTo as string);
    }
    redirect(
      `/auth/recovery${params.toString() ? `?${params.toString()}` : ""}`,
    );
  }

  return <RecoveryClient flow={flow} config={config} />;
}
