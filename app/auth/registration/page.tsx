import { getRegistrationFlow, OryPageParams } from "@ory/nextjs/app";
import { redirect } from "next/navigation";
import config from "@/ory.config";
import { RegistrationClient } from "./registration-client";

export const dynamic = "force-dynamic";

export default async function RegistrationPage(props: OryPageParams) {
  const searchParams = await props.searchParams;

  // Get return_to from search params
  const returnTo = searchParams.return_to;

  // Pass return_to to the registration flow if it exists
  const flowParams = returnTo
    ? { ...searchParams, return_to: returnTo }
    : searchParams;

  const flow = await getRegistrationFlow(config, flowParams);

  // If flow doesn't exist, redirect to create a new flow with return_to
  if (!flow) {
    const params = new URLSearchParams();
    if (returnTo) {
      params.set("return_to", returnTo as string);
    }
    redirect(
      `/auth/registration${params.toString() ? `?${params.toString()}` : ""}`,
    );
  }

  return <RegistrationClient flow={flow} config={config} />;
}
