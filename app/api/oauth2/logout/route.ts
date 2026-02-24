/**
 * OAuth2 Logout Handler
 * Handles Hydra logout challenges
 */

import { NextRequest, NextResponse } from "next/server";

const HYDRA_ADMIN_URL = process.env.HYDRA_ADMIN_URL;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const logoutChallenge = searchParams.get("logout_challenge");

    if (!logoutChallenge) {
      return NextResponse.json(
        { error: "Missing logout_challenge parameter" },
        { status: 400 }
      );
    }

    if (!HYDRA_ADMIN_URL) {
      return NextResponse.json(
        { error: "HYDRA_ADMIN_URL not configured" },
        { status: 500 }
      );
    }

    // Accept logout request
    const response = await fetch(
      `${HYDRA_ADMIN_URL}/admin/oauth2/auth/requests/logout/accept?logout_challenge=${logoutChallenge}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to accept logout: ${error}`);
    }

    const data = await response.json();
    return NextResponse.redirect(data.redirect_to);
  } catch (error) {
    console.error("OAuth2 logout error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: (error as Error).message },
      { status: 500 }
    );
  }
}
