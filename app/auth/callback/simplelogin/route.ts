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

    // Create Kratos session if sync was successful
    if (syncResult.success && syncResult.identityId) {
      try {
        const kratosAdminUrl = process.env.ORY_KRATOS_ADMIN_URL;

        // Create a session for this identity
        const sessionResponse = await fetch(
          `${kratosAdminUrl}/admin/identities/${syncResult.identityId}/sessions`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              expires_in: "7d",
            }),
          },
        );

        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();

          // Set the Kratos session cookie
          cookieStore.set(
            "ory_kratos_session",
            sessionData.session_token || sessionData.token,
            {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
              path: "/",
              maxAge: 60 * 60 * 24 * 7, // 7 days
            },
          );

          console.log("✅ Kratos session created for:", userData.email);
        } else {
          console.error(
            "Failed to create Kratos session:",
            await sessionResponse.text(),
          );
        }
      } catch (error) {
        console.error("Error creating Kratos session:", error);
        // Continue anyway - SimpleLogin session still works
      }
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
