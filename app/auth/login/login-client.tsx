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

    // Use gateway URL for OAuth callback (routes through nginx to app)
    const gatewayUrl =
      process.env.NEXT_PUBLIC_ORY_SDK_URL || window.location.origin;
    const redirectUri = `${gatewayUrl}/auth/callback/simplelogin`;
    const state = crypto.randomUUID();

    // Store state in sessionStorage for CSRF verification
    sessionStorage.setItem("simplelogin_state", state);

    console.log("SimpleLogin redirect URI:", redirectUri); // Debug log

    // Construct OAuth authorization URL
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      state: state,
      response_type: "code",
      scope: "openid profile email",
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
      </div>
    </div>
  );
}
