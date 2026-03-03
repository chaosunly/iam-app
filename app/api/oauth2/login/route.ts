/**
 * OAuth2 Login Handler
 * Hydra redirects here when user needs to authenticate
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@ory/nextjs/app";

const HYDRA_ADMIN_URL = process.env.HYDRA_ADMIN_URL || "http://hydra.railway.internal:4445";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    let login_challenge = searchParams.get("login_challenge");

    // If no login_challenge in URL, check cookie (preserved from initial call)
    if (!login_challenge) {
      login_challenge = request.cookies.get("hydra_login_challenge")?.value || null;
    }

    if (!login_challenge) {
      return NextResponse.json(
        { error: "login_challenge is required" },
        { status: 400 }
      );
    }

    // Check if user has Kratos session
    const session = await getServerSession();

    if (session && session.identity) {
      // User is already authenticated with Kratos
      // Accept the login request and tell Hydra who the user is
      const acceptResponse = await fetch(
        `${HYDRA_ADMIN_URL}/admin/oauth2/auth/requests/login/accept?login_challenge=${login_challenge}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subject: session.identity.id,
            remember: true,
            remember_for: 3600,
          }),
        }
      );

      if (!acceptResponse.ok) {
        const errorText = await acceptResponse.text();
        console.error("Failed to accept login:", errorText);
        return NextResponse.json(
          { error: "Failed to accept login" },
          { status: 500 }
        );
      }

      const acceptResult = await acceptResponse.json();
      
      // Redirect user back to Hydra and clear the cookie
      const response = NextResponse.redirect(acceptResult.redirect_to);
      response.cookies.delete("hydra_login_challenge");
      return response;
    } else {
      // No Kratos session - redirect to Kratos self-service login
      // Store login_challenge in a cookie so it survives the OIDC flow
      const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`;
      
      const response = NextResponse.redirect(
        `${baseUrl}/.ory/self-service/login/browser?return_to=${encodeURIComponent(`${baseUrl}/api/oauth2/login`)}`
      );
      
      // Store login_challenge in a secure cookie
      response.cookies.set("hydra_login_challenge", login_challenge, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 600, // 10 minutes
        path: "/",
      });
      
      return response;
    }
  } catch (error) {
    console.error("OAuth2 login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
