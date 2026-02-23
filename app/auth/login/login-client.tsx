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
      <div className="w-full max-w-md">
        {/* Kratos Login UI with native OIDC support */}
        {/* SimpleLogin will appear as an OIDC provider button automatically */}
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
