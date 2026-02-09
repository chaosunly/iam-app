import { getVerificationFlow, OryPageParams } from "@ory/nextjs/app";
import { redirect } from "next/navigation";
import config from "@/ory.config";
import { VerificationClient } from "./verification-client";

export const dynamic = "force-dynamic";

export default async function VerificationPage(props: OryPageParams) {
  const searchParams = await props.searchParams;

  // Get return_to from search params
  const returnTo = searchParams.return_to;

  // Pass return_to to the verification flow if it exists
  const flowParams = returnTo
    ? { ...searchParams, return_to: returnTo }
    : searchParams;

  const flow = await getVerificationFlow(config, flowParams);

  // If flow doesn't exist, redirect to create a new flow with return_to
  if (!flow) {
    const params = new URLSearchParams();
    if (returnTo) {
      params.set("return_to", returnTo as string);
    }
    redirect(
      `/auth/verification${params.toString() ? `?${params.toString()}` : ""}`,
    );
  }

  return <VerificationClient flow={flow} config={config} />;
}
