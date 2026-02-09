import { Registration } from "@ory/elements-react/theme";
import { getRegistrationFlow, OryPageParams } from "@ory/nextjs/app";

import config from "@/ory.config";

export const dynamic = "force-dynamic";

export default async function RegistrationPage(props: OryPageParams) {
  const searchParams = await props.searchParams;
  const flow = await getRegistrationFlow(config, searchParams);

  if (!flow) {
    return null;
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
}
