"use client";

import { Login } from "@ory/elements-react/theme";
import { OryClientConfiguration } from "@ory/elements-react";
import { LoginFlow } from "@ory/client-fetch";
import { useEffect } from "react";

interface LoginClientProps {
  flow: LoginFlow;
  config: OryClientConfiguration;
}

export function LoginClient({ flow, config }: LoginClientProps) {
  // Ensure SDK URL uses current origin for proper proxying
  const clientConfig: OryClientConfiguration = {
    ...config,
    sdk: {
      url:
        typeof window !== "undefined"
          ? window.location.origin
          : config.sdk?.url || "",
      options: config.sdk?.options || {},
    },
  };

  // Debug: Log the flow action URL to help troubleshoot
  useEffect(() => {
    console.log("Login flow action:", flow?.ui?.action);
    console.log("SDK URL:", clientConfig.sdk?.url);
    console.log("Flow ID:", flow?.id);
  }, [flow, clientConfig.sdk?.url]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-md">
        <Login flow={flow} config={clientConfig} />
      </div>
    </div>
  );
}
