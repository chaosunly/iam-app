"use client";

import { Settings } from "@ory/elements-react/theme";
import { SessionProvider } from "@ory/elements-react/client";
import { OryClientConfiguration } from "@ory/elements-react";
import { SettingsFlow } from "@ory/client-fetch";
import { useEffect } from "react";

interface SettingsClientProps {
  flow: SettingsFlow;
  config: OryClientConfiguration;
}

export function SettingsClient({ flow, config }: SettingsClientProps) {
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
    console.log("Settings flow action:", flow?.ui?.action);
    console.log("SDK URL:", clientConfig.sdk?.url);
    console.log("Flow ID:", flow?.id);
  }, [flow, clientConfig.sdk?.url]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-50 dark:bg-black">
      <div className="flex flex-col gap-8 items-center mb-8">
        <SessionProvider>
          <Settings
            flow={flow}
            config={clientConfig}
            components={{
              Card: {},
            }}
          />
        </SessionProvider>
      </div>
    </div>
  );
}
