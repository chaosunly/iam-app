import { OryPageParams, getLoginFlow } from "@ory/nextjs/app";
import { AutoOAuth2Login } from "../components/oauth2-login";
import { LoginClient } from "./login-client";
import config from "@/ory.config";

export const dynamic = "force-dynamic";

export default async function LoginPage(props: OryPageParams) {
  const searchParams = await props.searchParams;

  // Check if this is a Kratos flow (has flow parameter)
  const flowId = searchParams.flow;
  
  // If there's a Kratos flow, show the Kratos login form
  if (flowId) {
    const flow = await getLoginFlow(config, searchParams);
    
    if (flow) {
      return <LoginClient flow={flow} config={config} />;
    }
  }

  // Otherwise, trigger OAuth2 flow
  const returnTo = searchParams.return_to;
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      {error && typeof error === "string" && (
        <div className="fixed top-4 right-4 max-w-md p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-md shadow-lg z-50">
          <p className="font-medium">Authentication Error</p>
          <p className="text-sm mt-1">
            {errorMessages[error] || "An unexpected error occurred"}
          </p>
        </div>
      )}
      
      {!error && <AutoOAuth2Login returnTo={returnTo as string} />}
      
      {error && (
        <div className="text-center">
          <button
            onClick={() => window.location.href = "/auth/login"}
            className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
