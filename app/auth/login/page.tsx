import { Login } from "@ory/elements-react/theme";
import { getLoginFlow, OryPageParams } from "@ory/nextjs/app";

import config from "@/ory.config";

export const dynamic = "force-dynamic";

export default async function LoginPage(props: OryPageParams) {
  const searchParams = await props.searchParams;
  const flow = await getLoginFlow(config, searchParams);

  if (!flow) {
    return null;
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
}
