import { Verification } from "@ory/elements-react/theme";
import { getVerificationFlow, OryPageParams } from "@ory/nextjs/app";

import config from "@/ory.config";

export const dynamic = "force-dynamic";

export default async function VerificationPage(props: OryPageParams) {
  const searchParams = await props.searchParams;
  const flow = await getVerificationFlow(config, searchParams);

  if (!flow) {
    return null;
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
}
