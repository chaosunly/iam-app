import { FrontendApi, Configuration } from "@ory/client-fetch";

/**
 * Creates and returns an Ory Kratos client instance
 */
export function getOryClient() {
  const configuration = new Configuration({
    basePath: process.env.ORY_SDK_URL || process.env.ORY_KRATOS_PUBLIC_URL,
  });

  return new FrontendApi(configuration);
}

/**
 * Creates an admin Ory Kratos client for server-side operations
 */
export function getOryAdminClient() {
  const configuration = new Configuration({
    basePath: process.env.ORY_KRATOS_ADMIN_URL || process.env.ORY_SDK_URL,
  });

  return new FrontendApi(configuration);
}
