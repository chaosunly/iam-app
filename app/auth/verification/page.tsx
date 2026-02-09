import { Verification } from "@ory/elements-react/theme";
import { getVerificationFlow, OryPageParams } from "@ory/nextjs/app";

import config from "@/ory.config";

export default async function VerificationPage(props: OryPageParams) {
  try {
    const flow = await getVerificationFlow(config, props.searchParams);

    if (!flow) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <p>Initializing verification flow...</p>
        </div>
      );
    }

    return (
      <Verification
        flow={flow}
        config={config}
        components={{
          Card: {},
        }}
      />
    );
  } catch (error) {
    console.error("Verification flow error:", error);
    return (
      <div className="flex min-h-screen items-center justify-center flex-col gap-4">
        <h1 className="text-2xl font-bold">Verification Error</h1>
        <p>Failed to initialize verification flow.</p>
        <pre className="text-xs bg-gray-100 p-4 rounded">
          {JSON.stringify(error, null, 2)}
        </pre>
      </div>
    );
  }
}
