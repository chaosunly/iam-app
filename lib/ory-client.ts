import { FrontendApi, Configuration } from "@ory/client-fetch";

/**
 * Creates and returns an Ory Kratos client instance
 * Uses the app URL (proxied via middleware) to ensure proper URL generation
 */
export function getOryClient() {
  const configuration = new Configuration({
    basePath:
      process.env.ORY_SDK_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000",
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
