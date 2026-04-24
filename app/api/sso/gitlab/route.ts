import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/errors";

const POLIS_URL = process.env.POLIS_URL!;
const POLIS_GITLAB_CLIENT_ID = process.env.POLIS_GITLAB_CLIENT_ID!;
const POLIS_GITLAB_CLIENT_SECRET = process.env.POLIS_GITLAB_CLIENT_SECRET!;

export async function GET() {
  return withErrorHandler(async () => {
    const url = new URL("/api/v1/saml/idp/sso", POLIS_URL);
    url.searchParams.set("clientID", POLIS_GITLAB_CLIENT_ID);
    url.searchParams.set("clientSecret", POLIS_GITLAB_CLIENT_SECRET);

    const target = url.toString();

    // Use HTML redirect instead of HTTP 302 — nginx proxy_redirect rewrites
    // all Location headers to the gateway domain, breaking external redirects.
    const html = `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=${target}"></head><body><script>window.location.replace(${JSON.stringify(target)})</script></body></html>`;

    return new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  });
}
