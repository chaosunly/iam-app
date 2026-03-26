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

    const email = identity?.traits?.email;
    const username =
      identity?.traits?.username ||
      identity?.traits?.name?.first ||
      (email ? email.split("@")[0] : undefined);

    const idTokenClaims: Record<string, unknown> = {};
    if (email) {
      idTokenClaims.email = email;
      idTokenClaims.email_verified = true;
    }
    if (username) {
      idTokenClaims.username = username;
      idTokenClaims.preferred_username = username;
    }

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
          remember: true,
          remember_for: 3600,
          session: {
            id_token: consentRequest.subject ? idTokenClaims : undefined,
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
    
    // Redirect user back to Hydra
    return NextResponse.redirect(acceptResult.redirect_to);
  } catch (error) {
    console.error("OAuth2 consent error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
