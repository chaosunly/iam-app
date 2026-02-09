import { getLoginFlow, OryPageParams } from "@ory/nextjs/app";
import config from "@/ory.config";
import { redirect } from "next/navigation";
import { LoginClient } from "./login-client";

export const dynamic = "force-dynamic";

export default async function LoginPage(props: OryPageParams) {
  const searchParams = await props.searchParams;

  // Get return_to from search params
  const returnTo = searchParams.return_to;

  // Pass return_to to the login flow if it exists
  const flowParams = returnTo
    ? { ...searchParams, return_to: returnTo }
    : searchParams;

  const flow = await getLoginFlow(config, flowParams);

  // If flow doesn't exist, redirect to create a new flow with return_to
  if (!flow) {
    const params = new URLSearchParams();
    if (returnTo) {
      params.set("return_to", returnTo as string);
    }
    redirect(`/auth/login${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return <LoginClient flow={flow} config={config} />;
}
