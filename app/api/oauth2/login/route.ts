/**
 * OAuth2 Login Handler
 * Hydra redirects here when user needs to authenticate
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@ory/nextjs/app";
import config from "@/ory.config";

const HYDRA_ADMIN_URL = process.env.HYDRA_ADMIN_URL || "http://hydra.railway.internal:4445";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const login_challenge = searchParams.get("login_challenge");

    if (!login_challenge) {
      return NextResponse.json(
        { error: "login_challenge is required" },
        { status: 400 }
      );
    }

    // Check if user has Kratos session
    const session = await getServerSession(config);

    if (session) {
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
      
      // Redirect user back to Hydra
      return NextResponse.redirect(acceptResult.redirect_to);
    } else {
      // No Kratos session - redirect to Kratos login
      const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`;
      const returnTo = encodeURIComponent(
        `${baseUrl}/api/oauth2/login?login_challenge=${login_challenge}`
      );
      
      return NextResponse.redirect(
        `${baseUrl}/auth/login?return_to=${returnTo}`
      );
    }
  } catch (error) {
    console.error("OAuth2 login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
