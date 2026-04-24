import { OryPageParams } from "@ory/nextjs/app";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AuthSettingsPage(props: OryPageParams) {
  const searchParams = await props.searchParams;
  const flowId = searchParams.flow;

  if (flowId) {
    const params = new URLSearchParams({ flow: flowId as string });
    redirect(`/dashboard/settings?${params.toString()}`);
  }

  redirect("/dashboard/settings");
}
