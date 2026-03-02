/**
 * OAuth2 Callback Handler
 * Receives authorization code from Hydra and exchanges it for tokens
 */

import { NextRequest, NextResponse } from "next/headers";
import { cookies } from "next/headers";

const OAUTH2_CLIENT_ID = process.env.OAUTH2_CLIENT_ID || "ac90875e-fd72-46f9-a761-75686ba1ab76";
const OAUTH2_CLIENT_SECRET = process.env.OAUTH2_CLIENT_SECRET || "8tU~ewz38tL8btFMMWoHvtEtM4";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Get the base URL from the request
    const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    const HYDRA_TOKEN_URL = `${baseUrl}/oauth2/token`;
    const OAUTH2_REDIRECT_URI = `${baseUrl}/auth/callback`;

    // Check for OAuth errors
    if (error) {
      console.error("OAuth2 error:", error);
      return NextResponse.redirect(
        new URL(`/auth/login?error=${error}`, request.url)
      );
    }

    // Validate code presence
    if (!code) {
      return NextResponse.redirect(
        new URL("/auth/login?error=no_code", request.url)
      );
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch(HYDRA_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        client_id: OAUTH2_CLIENT_ID!,
        client_secret: OAUTH2_CLIENT_SECRET!,
        redirect_uri: OAUTH2_REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange failed:", errorText);
      return NextResponse.redirect(
        new URL("/auth/login?error=token_exchange_failed", request.url)
      );
    }

    const tokens = await tokenResponse.json();

    // Store tokens in HTTP-only cookies
    const cookieStore = await cookies();
    
    // Set access token (1 hour)
    cookieStore.set("access_token", tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: tokens.expires_in || 3600,
      path: "/",
    });

    // Set ID token
    cookieStore.set("id_token", tokens.id_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: tokens.expires_in || 3600,
      path: "/",
    });

    // Set refresh token (if present, 30 days)
    if (tokens.refresh_token) {
      cookieStore.set("refresh_token", tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: "/",
      });
    }

    // Redirect to dashboard or return_to URL
    const returnTo = state ? decodeURIComponent(state) : "/dashboard";
    return NextResponse.redirect(new URL(returnTo, request.url));
  } catch (error) {
    console.error("OAuth2 callback error:", error);
    return NextResponse.redirect(
      new URL("/auth/login?error=callback_failed", request.url)
    );
  }
}
