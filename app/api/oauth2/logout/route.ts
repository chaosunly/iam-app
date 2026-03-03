/**
 * OAuth2 Logout Handler
 * Hydra redirects here when user initiates logout
 */

import { NextRequest, NextResponse } from "next/server";

const HYDRA_ADMIN_URL = process.env.HYDRA_ADMIN_URL || "http://hydra.railway.internal:4445";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const logout_challenge = searchParams.get("logout_challenge");

    if (!logout_challenge) {
      return NextResponse.json(
        { error: "logout_challenge is required" },
        { status: 400 }
      );
    }

    // Accept the logout request
    const acceptResponse = await fetch(
      `${HYDRA_ADMIN_URL}/admin/oauth2/auth/requests/logout/accept?logout_challenge=${logout_challenge}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!acceptResponse.ok) {
      const errorText = await acceptResponse.text();
      console.error("Failed to accept logout:", errorText);
      return NextResponse.json(
        { error: "Failed to accept logout" },
        { status: 500 }
      );
    }

    const acceptResult = await acceptResponse.json();
    
    // Redirect to Kratos logout
    const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    const kratosLogoutUrl = `${baseUrl}/auth/logout`;
    
    // After Kratos logout, redirect to Hydra's redirect_to
    return NextResponse.redirect(
      `${kratosLogoutUrl}?return_to=${encodeURIComponent(acceptResult.redirect_to)}`
    );
  } catch (error) {
    console.error("OAuth2 logout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
