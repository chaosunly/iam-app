/**
 * OAuth2 Callback Handler
 * Receives authorization code from Hydra and exchanges it for tokens
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Get the gateway URL from headers (set by nginx)
    const forwardedHost = request.headers.get("x-forwarded-host");
    const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
    const gatewayUrl = forwardedHost
      ? `${forwardedProto}://${forwardedHost}`
      : `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    
    const HYDRA_TOKEN_URL = `${gatewayUrl}/oauth2/token`;
    const OAUTH2_REDIRECT_URI = `${gatewayUrl}/auth/callback`;
    
    // Get OAuth2 credentials from environment
    const OAUTH2_CLIENT_ID = process.env.OAUTH2_CLIENT_ID;
    const OAUTH2_CLIENT_SECRET = process.env.OAUTH2_CLIENT_SECRET;

    if (!OAUTH2_CLIENT_ID || !OAUTH2_CLIENT_SECRET) {
      console.error("OAuth2 credentials not configured");
      return NextResponse.redirect(`${gatewayUrl}/auth/login?error=oauth_not_configured`);
    }

    // Check for OAuth errors
    if (error) {
      console.error("OAuth error:", error);
      return NextResponse.redirect(`${gatewayUrl}/auth/login?error=${error}`);
    }

    // Check for authorization code
    if (!code) {
      return NextResponse.redirect(`${gatewayUrl}/auth/login?error=no_code`);
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch(HYDRA_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          `${OAUTH2_CLIENT_ID}:${OAUTH2_CLIENT_SECRET}`
        ).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: OAUTH2_REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange failed:", errorText);
      return NextResponse.redirect(
        `${gatewayUrl}/auth/login?error=token_exchange_failed`
      );
    }

    const tokens = await tokenResponse.json();

    // Store tokens in HTTP-only cookies
    const cookieStore = await cookies();
    
    cookieStore.set("access_token", tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: tokens.expires_in || 3600,
    });

    if (tokens.refresh_token) {
      cookieStore.set("refresh_token", tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });
    }

    if (tokens.id_token) {
      cookieStore.set("id_token", tokens.id_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: tokens.expires_in || 3600,
      });
    }

    // Redirect to the state parameter (return URL) or dashboard
    const redirectUrl = state || "/dashboard";
    return NextResponse.redirect(`${gatewayUrl}${redirectUrl}`);
  } catch (error) {
    console.error("OAuth callback error:", error);
    // Get gateway URL for error redirect
    const forwardedHost = request.headers.get("x-forwarded-host");
    const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
    const gatewayUrl = forwardedHost
      ? `${forwardedProto}://${forwardedHost}`
      : `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    return NextResponse.redirect(`${gatewayUrl}/auth/login?error=callback_failed`);
  }
}
