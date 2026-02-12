import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createOrLinkOryIdentity } from "@/lib/simplelogin-auth";

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
          redirect_uri: `${request.nextUrl.origin}/auth/callback/simplelogin`,
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

    console.log("SimpleLogin user authenticated:", {
      sub: userData.sub,
      email: userData.email,
      name: userData.name,
    });

    // Store user data temporarily in a secure cookie for profile completion
    const cookieStore = await cookies();
    const response = NextResponse.redirect(
      new URL("/auth/complete-profile", request.url),
    );

    cookieStore.set(
      "pending_simplelogin_user",
      JSON.stringify({
        sub: userData.sub,
        email: userData.email,
        name: userData.name,
        avatar_url: userData.avatar_url,
      }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 15, // 15 minutes
      },
    );

    // Create or link Ory identity
    try {
      await createOrLinkOryIdentity(userData);
    } catch (oryError) {
      console.error("Ory identity creation warning:", oryError);
      // Continue anyway - profile completion will handle it
    }

    return response;
  } catch (error) {
    console.error("SimpleLogin authentication error:", error);
    return NextResponse.redirect(
      new URL("/auth/login?error=authentication_failed", request.url),
    );
  }
}
