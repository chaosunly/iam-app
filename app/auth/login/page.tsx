import { getLoginFlow, OryPageParams } from "@ory/nextjs/app";
import config from "@/ory.config";
import { redirect } from "next/navigation";
import { LoginClient } from "./login-client";

export const dynamic = "force-dynamic";

export default async function LoginPage(props: OryPageParams) {
  const searchParams = await props.searchParams;

  // Get return_to from search params
  const returnTo = searchParams.return_to;

  // Get error from search params for OAuth errors
  const error = searchParams.error;

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

  // Error messages for OAuth failures
  const errorMessages: Record<string, string> = {
    missing_parameters: "Authentication failed: Missing required parameters",
    authentication_failed: "Authentication failed. Please try again.",
    access_denied: "You denied access to your SimpleLogin account",
    no_code: "No authorization code received",
    oauth_failed: "OAuth authentication failed",
  };

  return (
    <>
      {error && typeof error === "string" && (
        <div className="fixed top-4 right-4 max-w-md p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-md shadow-lg z-50">
          <p className="font-medium">Authentication Error</p>
          <p className="text-sm mt-1">
            {errorMessages[error] || "An unexpected error occurred"}
          </p>
        </div>
      )}
      <LoginClient flow={flow} config={config} />
    </>
  );
}
