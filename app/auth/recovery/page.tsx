import { Recovery } from "@ory/elements-react/theme";
import { getRecoveryFlow, OryPageParams } from "@ory/nextjs/app";

import config from "@/ory.config";

export default async function RecoveryPage(props: OryPageParams) {
  try {
    const flow = await getRecoveryFlow(config, props.searchParams);

    if (!flow) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <p>Initializing recovery flow...</p>
        </div>
      );
    }

    return (
      <Recovery
        flow={flow}
        config={config}
        components={{
          Card: {},
        }}
      />
    );
  } catch (error) {
    console.error("Recovery flow error:", error);
    return (
      <div className="flex min-h-screen items-center justify-center flex-col gap-4">
        <h1 className="text-2xl font-bold">Recovery Error</h1>
        <p>Failed to initialize recovery flow.</p>
        <pre className="text-xs bg-gray-100 p-4 rounded">
          {JSON.stringify(error, null, 2)}
        </pre>
      </div>
    );
  }
}
