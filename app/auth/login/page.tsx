import { OryPageParams, getLoginFlow } from "@ory/nextjs/app";
import { AutoOAuth2Login } from "../components/oauth2-login";
import { LoginClient } from "./login-client";
import { LoginError } from "./login-error";
import config from "@/ory.config";

export const dynamic = "force-dynamic";

export default async function LoginPage(props: OryPageParams) {
  const searchParams = await props.searchParams;

  // Check if this is a Kratos flow (has flow parameter)
  const flowId = searchParams.flow;
  const returnTo = searchParams.return_to;
  
  // If there's a Kratos flow, show the Kratos login form
  if (flowId) {
    const flow = await getLoginFlow(config, searchParams);
    
    if (flow) {
      return <LoginClient flow={flow} config={config} />;
    }
  }

  // If there's a return_to but no flow, this means Kratos is asking us to login
  // We need to redirect to Kratos to create a login flow, not start OAuth2
  if (returnTo && !flowId) {
    const { redirect } = await import("next/navigation");
    const baseUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}`;
    redirect(`${baseUrl}/.ory/self-service/login/browser?return_to=${encodeURIComponent(returnTo as string)}`);
  }

  // Otherwise, trigger OAuth2 flow (fresh login request)
  const error = searchParams.error;

  // Error messages for OAuth failures
  const errorMessages: Record<string, string> = {
    missing_parameters: "Authentication failed: Missing required parameters",
    authentication_failed: "Authentication failed. Please try again.",
    access_denied: "You denied access to your SimpleLogin account",
    no_code: "No authorization code received",
    oauth_failed: "OAuth authentication failed",
    token_exchange_failed: "Failed to exchange authorization code for tokens",
    callback_failed: "OAuth callback processing failed",
    oauth_not_configured: "OAuth2 is not configured properly",
  };

  // Show error if present
  if (error && typeof error === "string") {
    return <LoginError error={error} errorMessages={errorMessages} />;
  }

  // Trigger OAuth2 flow
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <AutoOAuth2Login returnTo={returnTo as string} />
    </div>
  );
}
