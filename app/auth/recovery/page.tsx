import { Recovery } from "@ory/elements-react/theme";
import { getRecoveryFlow, OryPageParams } from "@ory/nextjs/app";

import config from "@/ory.config";

export const dynamic = "force-dynamic";

export default async function RecoveryPage(props: OryPageParams) {
  const searchParams = await props.searchParams;
  const flow = await getRecoveryFlow(config, searchParams);

  if (!flow) {
    return null;
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
}
