import { Login } from "@ory/elements-react/theme";
import { getLoginFlow, OryPageParams } from "@ory/nextjs/app";

import config from "@/ory.config";

export default async function LoginPage(props: OryPageParams) {
  try {
    const flow = await getLoginFlow(config, props.searchParams);

    if (!flow) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <p>Initializing login flow...</p>
        </div>
      );
    }

    return (
      <Login
        flow={flow}
        config={config}
        components={{
          Card: {},
        }}
      />
    );
  } catch (error) {
    console.error("Login flow error:", error);
    return (
      <div className="flex min-h-screen items-center justify-center flex-col gap-4">
        <h1 className="text-2xl font-bold">Login Error</h1>
        <p>Failed to initialize login flow.</p>
        <pre className="text-xs bg-gray-100 p-4 rounded">
          {JSON.stringify(error, null, 2)}
        </pre>
      </div>
    );
  }
}
