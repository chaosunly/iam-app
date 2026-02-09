import { Registration } from "@ory/elements-react/theme";
import { getRegistrationFlow, OryPageParams } from "@ory/nextjs/app";

import config from "@/ory.config";

export default async function RegistrationPage(props: OryPageParams) {
  try {
    const flow = await getRegistrationFlow(config, props.searchParams);

    if (!flow) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <p>Initializing registration flow...</p>
        </div>
      );
    }

    return (
      <Registration
        flow={flow}
        config={config}
        components={{
          Card: {},
        }}
      />
    );
  } catch (error) {
    console.error("Registration flow error:", error);
    return (
      <div className="flex min-h-screen items-center justify-center flex-col gap-4">
        <h1 className="text-2xl font-bold">Registration Error</h1>
        <p>Failed to initialize registration flow.</p>
        <pre className="text-xs bg-gray-100 p-4 rounded">
          {JSON.stringify(error, null, 2)}
        </pre>
      </div>
    );
  }
}
