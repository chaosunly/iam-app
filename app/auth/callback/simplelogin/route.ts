/*
 * ⚠️ DEPRECATED: This manual OAuth callback is no longer used.
 *
 * SimpleLogin is now configured as a native OIDC provider in Kratos.
 * The authentication flow is handled entirely by Kratos at /.ory/self-service/login/flows
 *
 * This file can be safely removed after verifying the OIDC flow works correctly.
 *
 * Migration completed: Users now authenticate via Kratos OIDC flow.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { syncSimpleLoginUserToKratosSync } from "@/lib/services/simplelogin-sync.service";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Handle OAuth errors
  if (error) {
    console.error("SimpleLogin OAuth error:", error);
    return NextResponse.redirect(
      new URL(`/auth/login?error=${error}`, request.url),
    );
  }

  // Validate required parameters
  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/auth/login?error=missing_parameters", request.url),
    );
  }

  try {
    // Use gateway URL for consistency with OAuth authorization
    const gatewayUrl =
      process.env.NEXT_PUBLIC_ORY_SDK_URL || request.nextUrl.origin;
    const redirectUri = `${gatewayUrl}/auth/callback/simplelogin`;

    console.log("Token exchange redirect_uri:", redirectUri); // Debug log

    // Exchange authorization code for access token
    const tokenResponse = await fetch(
      "https://app.simplelogin.io/oauth2/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code,
          client_id: process.env.NEXT_PUBLIC_SIMPLELOGIN_CLIENT_ID!,
          client_secret: process.env.SIMPLELOGIN_CLIENT_SECRET!,
          redirect_uri: redirectUri,
        }),
      },
    );

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Token exchange failed:", errorData);
      throw new Error("Failed to exchange code for token");
    }

    const tokenData = await tokenResponse.json();

    // Fetch user information
    const userResponse = await fetch(
      "https://app.simplelogin.io/oauth2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      },
    );

    if (!userResponse.ok) {
      throw new Error("Failed to fetch user info");
    }

    const userData = await userResponse.json();

    console.log("SimpleLogin user authenticated:", userData);

    // Directly create SimpleLogin session without profile completion page
    const cookieStore = await cookies();

    // Create session cookie
    cookieStore.set(
      "simplelogin_session",
      JSON.stringify({
        userId: userData.sub,
        email: userData.email,
        name: userData.name || userData.email.split("@")[0],
        avatar_url: userData.avatar_url,
        provider: "simplelogin",
        authenticated: true,
        createdAt: new Date().toISOString(),
      }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      },
    );

    console.log("✅ SimpleLogin session created for:", userData.email);

    // Sync to Kratos and create a Kratos session
    // This gives SimpleLogin users full access to Kratos features
    const syncResult = await syncSimpleLoginUserToKratosSync({
      userId: userData.sub,
      email: userData.email,
      name: userData.name || userData.email.split("@")[0],
      avatar_url: userData.avatar_url,
    });

    console.log("Sync result:", syncResult);

    // Note: In Kratos v25+, sessions cannot be created programmatically via Admin API.
    // Sessions are created through self-service flows only.
    //
    // ARCHITECTURAL NOTE:
    // For full Kratos settings access, SimpleLogin should be configured as an OIDC
    // provider in Kratos's identity schema. This allows Kratos to manage the OAuth
    // flow natively and create proper sessions automatically.
    //
    // Current implementation: SimpleLogin session works for authentication,
    // but users get a custom settings page instead of Kratos's native UI.

    if (syncResult.success && syncResult.identityId) {
      console.log(
        `✅ SimpleLogin user synced to Kratos identity: ${syncResult.identityId}`,
      );
    } else {
      console.log(
        "⚠️ Kratos sync skipped:",
        syncResult.error || "No identity ID",
      );
    }

    // Redirect directly to dashboard
    return NextResponse.redirect(new URL("/dashboard", request.url));
  } catch (error) {
    console.error("SimpleLogin authentication error:", error);
    return NextResponse.redirect(
      new URL("/auth/login?error=authentication_failed", request.url),
    );
  }
}
