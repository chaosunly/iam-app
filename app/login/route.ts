/**
 * OAuth2 Login Handler Redirect
 * This route handles direct /login requests and redirects to the OAuth2 handler
 * Preserves all query parameters including login_challenge
 */
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Get all query parameters from the request
    const searchParams = new URLSearchParams(request.nextUrl.search);
    const login_challenge = searchParams.get("login_challenge");

    if (!login_challenge) {
      return NextResponse.json(
        { error: "login_challenge is required" },
        { status: 400 }
      );
    }

    console.info("/login redirecting to /api/oauth2/login", { 
      login_challenge,
      referrer: request.headers.get("referer"),
    });

    // Redirect to the actual OAuth2 login handler with the challenge preserved
    const apiLoginUrl = new URL("/api/oauth2/login", request.nextUrl.origin);
    apiLoginUrl.searchParams.set("login_challenge", login_challenge);
    
    return NextResponse.redirect(apiLoginUrl.toString());
  } catch (error) {
    console.error("/login error:", error);
    return NextResponse.json(
      { error: "Failed to handle login redirect", details: String(error) },
      { status: 500 }
    );
  }
}
