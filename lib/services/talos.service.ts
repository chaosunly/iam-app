import { InternalServerError } from "@/lib/errors";

const TALOS_ADMIN_URL =
  process.env.ORY_TALOS_ADMIN_URL || "http://localhost:4420";
const TALOS_HEALTH_URL =
  process.env.ORY_TALOS_HEALTH_URL || "http://localhost:4422";

type TalosProxyResult = {
  status: number;
  contentType: string;
  body: string;
};

function joinUrl(baseUrl: string, path: string, search = "") {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}${search}`;
}

export async function proxyTalosAdminRequest(
  path: string,
  search: string,
  init: RequestInit,
): Promise<TalosProxyResult> {
  const url = joinUrl(TALOS_ADMIN_URL, path, search);
  const response = await fetch(url, init);
  const body = await response.text();
  const contentType =
    response.headers.get("content-type") || "application/json";

  return {
    status: response.status,
    contentType,
    body,
  };
}

export async function getTalosHealthReady(): Promise<TalosProxyResult> {
  try {
    const response = await fetch(joinUrl(TALOS_HEALTH_URL, "/health/ready"), {
      method: "GET",
      cache: "no-store",
    });

    const body = await response.text();
    const contentType =
      response.headers.get("content-type") || "application/json";

    return {
      status: response.status,
      contentType,
      body,
    };
  } catch (error) {
    throw new InternalServerError(
      `Failed to reach Talos health endpoint: ${(error as Error).message}`,
    );
  }
}
