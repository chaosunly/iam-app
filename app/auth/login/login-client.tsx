"use client";

import { Login } from "@ory/elements-react/theme";
import { OryClientConfiguration } from "@ory/elements-react";
import { LoginFlow } from "@ory/client-fetch";
import { useEffect, useState } from "react";

interface LoginClientProps {
  flow: LoginFlow;
  config: OryClientConfiguration;
}

export function LoginClient({ flow, config }: LoginClientProps) {
  const [mounted, setMounted] = useState(false);

  // Ensure SDK URL uses current origin for proper proxying
  const clientConfig: OryClientConfiguration = {
    ...config,
    sdk: {
      url: mounted ? window.location.origin : config.sdk?.url || "",
      options: config.sdk?.options || {},
    },
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Debug: Log the flow action URL to help troubleshoot
  useEffect(() => {
    if (mounted) {
      console.log("Login flow action:", flow?.ui?.action);
      console.log("SDK URL:", clientConfig.sdk?.url);
      console.log("Flow ID:", flow?.id);
    }
  }, [flow, clientConfig.sdk?.url, mounted]);

  const handleSimpleLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_SIMPLELOGIN_CLIENT_ID;

    if (!clientId) {
      console.error("SimpleLogin Client ID not configured");
      return;
    }

    const redirectUri = `${window.location.origin}/auth/callback/simplelogin`;
    const state = crypto.randomUUID(); // Generate secure random state

    // Store state in sessionStorage for CSRF verification
    sessionStorage.setItem("simplelogin_state", state);

    // Construct OAuth authorization URL
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      state: state,
      response_type: "code",
      scope: "openid profile email", // Request user info
    });

    const authUrl = `https://app.simplelogin.io/oauth2/authorize?${params.toString()}`;

    window.location.href = authUrl;
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-50 dark:bg-black">
        <div className="w-full max-w-md space-y-4">
          <div className="animate-pulse">
            <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-md space-y-4">
        <Login
          flow={flow}
          config={clientConfig}
          components={{
            Card: {},
          }}
        />

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-300 dark:border-gray-700" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-zinc-50 dark:bg-black px-2 text-gray-500">
              Or continue with
            </span>
          </div>
        </div>

        {/* SimpleLogin Button */}
        <button
          onClick={handleSimpleLogin}
          type="button"
          className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#4285F4" />
            <path d="M2 17L12 22L22 17V12L12 17L2 12V17Z" fill="#34A853" />
          </svg>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Sign in with SimpleLogin
          </span>
        </button>
      </div>
    </div>
  );
}
