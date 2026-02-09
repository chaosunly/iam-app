import { Settings } from "@ory/elements-react/theme";
import { SessionProvider } from "@ory/elements-react/client";
import { getSettingsFlow, OryPageParams } from "@ory/nextjs/app";
import "@ory/elements-react/theme/styles.css";

import config from "@/ory.config";

export default async function SettingsPage(props: OryPageParams) {
  try {
    const flow = await getSettingsFlow(config, props.searchParams);

    if (!flow) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <p>Initializing settings flow...</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-8 items-center mb-8">
        <SessionProvider>
          <Settings
            flow={flow as any}
            config={config}
            components={{
              Card: {},
            }}
          />
        </SessionProvider>
      </div>
    );
  } catch (error) {
    console.error("Settings flow error:", error);
    return (
      <div className="flex min-h-screen items-center justify-center flex-col gap-4">
        <h1 className="text-2xl font-bold">Settings Error</h1>
        <p>Failed to initialize settings flow.</p>
        <pre className="text-xs bg-gray-100 p-4 rounded">
          {JSON.stringify(error, null, 2)}
        </pre>
      </div>
    );
  }
}
