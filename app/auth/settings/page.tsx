import {
  getSettingsFlow,
  OryPageParams,
  getServerSession,
} from "@ory/nextjs/app";
import { redirect } from "next/navigation";
import { SettingsFlow } from "@ory/client-fetch";
import config from "@/ory.config";
import { SettingsClient } from "./settings-client";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function SettingsPage(props: OryPageParams) {
  const searchParams = await props.searchParams;

  // Check for SimpleLogin session first
  const cookieStore = await cookies();
  const simpleLoginSession = cookieStore.get("simplelogin_session");
  let isSimpleLoginUser = false;

  if (simpleLoginSession) {
    try {
      const sessionData = JSON.parse(simpleLoginSession.value);
      if (sessionData.authenticated && sessionData.provider === "simplelogin") {
        isSimpleLoginUser = true;
      }
    } catch (error) {
      console.error("Failed to parse SimpleLogin session:", error);
    }
  }

  // For SimpleLogin users, check if they have an Ory session
  // If not, show a message that settings are not available for SimpleLogin users
  if (isSimpleLoginUser) {
    const session = await getServerSession();
    if (!session || !session.identity) {
      // SimpleLogin user without Ory session - redirect to dashboard with message
      return (
        <div className="flex items-center justify-center min-h-screen bg-zinc-50 dark:bg-black">
          <div className="max-w-md p-8 bg-white dark:bg-zinc-900 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-800">
            <h2 className="text-2xl font-bold mb-4 text-zinc-900 dark:text-zinc-50">
              Settings Not Available
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              Settings management is currently not available for SimpleLogin
              authenticated users. You can manage your SimpleLogin account
              settings directly at{" "}
              <a
                href="https://app.simplelogin.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                app.simplelogin.io
              </a>
            </p>
            <a
              href="/dashboard"
              className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Back to Dashboard
            </a>
          </div>
        </div>
      );
    }
  }

  // Get return_to from search params
  const returnTo = searchParams.return_to;

  // Pass return_to to the settings flow if it exists
  const flowParams = returnTo
    ? { ...searchParams, return_to: returnTo }
    : searchParams;

  const flow = await getSettingsFlow(config, flowParams);

  // If flow doesn't exist, redirect to create a new flow with return_to
  if (!flow) {
    const params = new URLSearchParams();
    if (returnTo) {
      params.set("return_to", returnTo as string);
    }
    redirect(
      `/auth/settings${params.toString() ? `?${params.toString()}` : ""}`,
    );
  }

  // Type assertion needed due to version conflicts between @ory packages
  return (
    <SettingsClient flow={flow as unknown as SettingsFlow} config={config} />
  );
}
