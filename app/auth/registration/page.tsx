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

  // DEBUG: log exactly what Kratos returned so we can see which groups/nodes are present
  if (flow) {
    const groups = flow.ui.nodes.reduce<Record<string, string[]>>((acc, n) => {
      const g = n.group ?? "default";
      const name = (n.attributes as { name?: string }).name ?? n.type;
      (acc[g] ??= []).push(name);
      return acc;
    }, {});
    console.log("[RegistrationPage] flow.ui.action:", flow.ui.action);
    console.log("[RegistrationPage] groups:", JSON.stringify(groups));
  } else {
    console.log("[RegistrationPage] flow is null");
  }

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

  return <RegistrationClient flow={flow} />;
}
