import { NextResponse } from "next/server";

const POLIS_URL = process.env.POLIS_URL!;
const POLIS_GITLAB_CLIENT_ID = process.env.POLIS_GITLAB_CLIENT_ID!;
const POLIS_GITLAB_CLIENT_SECRET = process.env.POLIS_GITLAB_CLIENT_SECRET!;

export async function GET() {
  const url = new URL("/api/v1/saml/idp/sso", POLIS_URL);
  url.searchParams.set("clientID", POLIS_GITLAB_CLIENT_ID);
  url.searchParams.set("clientSecret", POLIS_GITLAB_CLIENT_SECRET);

  return NextResponse.redirect(url.toString());
}
