"use client";

import { Verification } from "@ory/elements-react/theme";
import { OryClientConfiguration } from "@ory/elements-react";
import { VerificationFlow } from "@ory/client-fetch";
import { useEffect } from "react";

interface VerificationClientProps {
  flow: VerificationFlow;
  config: OryClientConfiguration;
}

export function VerificationClient({ flow, config }: VerificationClientProps) {
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
    console.log("Verification flow action:", flow?.ui?.action);
    console.log("SDK URL:", clientConfig.sdk?.url);
    console.log("Flow ID:", flow?.id);
  }, [flow, clientConfig.sdk?.url]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-50 dark:bg-black">
      <Verification
        flow={flow}
        config={clientConfig}
        components={{
          Card: {},
        }}
      />
    </div>
  );
}
