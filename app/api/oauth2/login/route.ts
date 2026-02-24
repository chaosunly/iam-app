/**
 * OAuth2 Login Handler
 * Handles Hydra login challenges by checking Kratos session
 * If session exists, auto-accepts login. Otherwise redirects to Kratos login.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@ory/nextjs/app";
import {
  getOAuth2LoginRequest,
  acceptOAuth2LoginRequest,
} from "@/lib/services/hydra.service";

const KRATOS_PUBLIC_URL = process.env.KRATOS_PUBLIC_URL || process.env.NEXT_PUBLIC_ORY_SDK_URL;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || "http://localhost:3000";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const loginChallenge = searchParams.get("login_challenge");

    if (!loginChallenge) {
      return NextResponse.json(
        { error: "Missing login_challenge parameter" },
        { status: 400 }
      );
    }

    // Get login request info from Hydra
    const loginRequest = await getOAuth2LoginRequest(loginChallenge);

    // If Hydra says we can skip (user already authenticated), accept immediately
    if (loginRequest.skip && loginRequest.subject) {
      const acceptResponse = await acceptOAuth2LoginRequest(loginChallenge, {
        subject: loginRequest.subject,
        remember: true,
        remember_for: 3600,
      });
      return NextResponse.redirect(acceptResponse.redirect_to);
    }

    // Check if user has an active Kratos session
    const session = await getServerSession();

    if (session?.identity?.id) {
      // User is authenticated with Kratos, accept the login
      const acceptResponse = await acceptOAuth2LoginRequest(loginChallenge, {
        subject: session.identity.id,
        remember: true,
        remember_for: 3600,
      });
      return NextResponse.redirect(acceptResponse.redirect_to);
    }

    // No session - redirect to Kratos login
    if (!KRATOS_PUBLIC_URL) {
      return NextResponse.json(
        { error: "KRATOS_PUBLIC_URL not configured" },
        { status: 500 }
      );
    }

    // Build return URL that includes the login_challenge
    const returnUrl = new URL("/api/oauth2/login", APP_URL);
    returnUrl.searchParams.set("login_challenge", loginChallenge);

    const kratosLoginUrl = new URL("/self-service/login/browser", KRATOS_PUBLIC_URL);
    kratosLoginUrl.searchParams.set("return_to", returnUrl.toString());

    return NextResponse.redirect(kratosLoginUrl.toString());
  } catch (error) {
    console.error("OAuth2 login error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: (error as Error).message },
      { status: 500 }
    );
  }
}
