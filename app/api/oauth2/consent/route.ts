/**
 * OAuth2 Consent Handler
 * Hydra redirects here to ask user for consent
 * For our own app, we auto-accept since skip_consent=true
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@ory/nextjs/app";

const HYDRA_ADMIN_URL = process.env.HYDRA_ADMIN_URL || "http://hydra.railway.internal:4445";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const consent_challenge = searchParams.get("consent_challenge");

    if (!consent_challenge) {
      return NextResponse.json(
        { error: "consent_challenge is required" },
        { status: 400 }
      );
    }

    // Get consent request info from Hydra
    const consentResponse = await fetch(
      `${HYDRA_ADMIN_URL}/admin/oauth2/auth/requests/consent?consent_challenge=${consent_challenge}`
    );

    if (!consentResponse.ok) {
      const errorText = await consentResponse.text();
      console.error("Failed to get consent request:", errorText);
      return NextResponse.json(
        { error: "Failed to get consent request" },
        { status: 500 }
      );
    }

    const consentRequest = await consentResponse.json();

    const session = await getServerSession();
    const identity = session?.identity as
      | {
          traits?: {
            email?: string;
            username?: string;
            name?: {
              first?: string;
              last?: string;
            };
          };
        }
      | undefined;

    const consentContext = (consentRequest.context ?? {}) as {
      email?: string;
      username?: string;
      preferred_username?: string;
      name?: string;
    };

    const displayNameFromTraits = [
      identity?.traits?.name?.first,
      identity?.traits?.name?.last,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    const email = identity?.traits?.email || consentContext.email;
    const username =
      identity?.traits?.username ||
      consentContext.username ||
      consentContext.preferred_username ||
      identity?.traits?.name?.first ||
      (email ? email.split("@")[0] : undefined);
    const name = displayNameFromTraits || consentContext.name || username;

    const idTokenClaims: Record<string, unknown> = {};
    if (email) {
      idTokenClaims.email = email;
      idTokenClaims.email_verified = true;
    }
    if (username) {
      idTokenClaims.username = username;
      idTokenClaims.preferred_username = username;
    }
    if (name) {
      idTokenClaims.name = name;
    }

    console.info("/api/oauth2/consent claim mapping", {
      subject: consentRequest.subject,
      hasSessionIdentity: Boolean(identity),
      contextKeys: Object.keys(consentContext),
      claimKeys: Object.keys(idTokenClaims),
    });

    // Auto-accept consent with requested scopes
    const acceptResponse = await fetch(
      `${HYDRA_ADMIN_URL}/admin/oauth2/auth/requests/consent/accept?consent_challenge=${consent_challenge}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          grant_scope: consentRequest.requested_scope,
          grant_access_token_audience: consentRequest.requested_access_token_audience,
          remember: false,
          remember_for: 0,
          session: {
            id_token: consentRequest.subject
              ? {
                  ...idTokenClaims,
                  sub: consentRequest.subject,
                }
              : undefined,
          },
        }),
      }
    );

    if (!acceptResponse.ok) {
      const errorText = await acceptResponse.text();
      console.error("Failed to accept consent:", errorText);
      return NextResponse.json(
        { error: "Failed to accept consent" },
        { status: 500 }
      );
    }

    const acceptResult = await acceptResponse.json();

    // Rewrite Hydra's public-domain redirect_to through nginx (same reason as login handler)
    const NGINX_URL = (process.env.NGINX_URL || "").replace(/\/$/, "");
    let redirectTo = acceptResult.redirect_to as string;
    if (NGINX_URL && redirectTo) {
      try {
        const url = new URL(redirectTo);
        const nginxUrl = new URL(NGINX_URL);
        if (url.pathname.startsWith("/oauth2/") && url.hostname !== nginxUrl.hostname) {
          url.hostname = nginxUrl.hostname;
          url.protocol = nginxUrl.protocol;
          url.port = nginxUrl.port;
          redirectTo = url.toString();
        }
      } catch {
        // keep original if URL parsing fails
      }
    }

    // Redirect user back to Hydra (via nginx proxy)
    return NextResponse.redirect(redirectTo);
  } catch (error) {
    console.error("OAuth2 consent error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
