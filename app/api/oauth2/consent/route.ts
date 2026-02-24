/**
 * OAuth2 Consent Handler
 * Handles Hydra consent challenges
 * Auto-accepts consent by default (can be customized per client/scope)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getOAuth2ConsentRequest,
  acceptOAuth2ConsentRequest,
} from "@/lib/services/hydra.service";

const AUTO_ACCEPT_CONSENT = process.env.AUTO_ACCEPT_CONSENT !== "false";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const consentChallenge = searchParams.get("consent_challenge");

    if (!consentChallenge) {
      return NextResponse.json(
        { error: "Missing consent_challenge parameter" },
        { status: 400 }
      );
    }

    // Get consent request info from Hydra
    const consentRequest = await getOAuth2ConsentRequest(consentChallenge);

    // Check if we should skip (user already consented)
    const shouldAutoAccept =
      consentRequest.skip ||
      AUTO_ACCEPT_CONSENT ||
      consentRequest.client?.skip_consent;

    if (shouldAutoAccept) {
      // Auto-accept consent
      const acceptResponse = await acceptOAuth2ConsentRequest(consentChallenge, {
        grant_scope: consentRequest.requested_scope || [],
        grant_access_token_audience: consentRequest.requested_access_token_audience || [],
        remember: true,
        remember_for: 3600,
        session: {
          // Add any claims to the ID token here
          id_token: {
            // Example: email: user.email
          },
          // Add any claims to the access token here
          access_token: {
            // Example: role: user.role
          },
        },
      });

      return NextResponse.redirect(acceptResponse.redirect_to);
    }

    // If you want to show a consent UI, implement it here
    // For now, we'll just auto-accept
    const acceptResponse = await acceptOAuth2ConsentRequest(consentChallenge, {
      grant_scope: consentRequest.requested_scope || [],
      grant_access_token_audience: consentRequest.requested_access_token_audience || [],
      remember: false,
      session: {
        id_token: {},
        access_token: {},
      },
    });

    return NextResponse.redirect(acceptResponse.redirect_to);
  } catch (error) {
    console.error("OAuth2 consent error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: (error as Error).message },
      { status: 500 }
    );
  }
}
