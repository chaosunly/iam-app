/**
 * OAuth2 Logout Handler
 * Hydra redirects here when user initiates logout
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const HYDRA_ADMIN_URL = process.env.HYDRA_ADMIN_URL || "http://hydra.railway.internal:4445";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const logout_challenge = searchParams.get("logout_challenge");

    // Get gateway URL
    const forwardedHost = request.headers.get("x-forwarded-host");
    const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
    const gatewayUrl = forwardedHost
      ? `${forwardedProto}://${forwardedHost}`
      : `${request.nextUrl.protocol}//${request.nextUrl.host}`;

    if (!logout_challenge) {
      return NextResponse.json(
        { error: "logout_challenge is required" },
        { status: 400 }
      );
    }

    // Clear OAuth2 token cookies
    const cookieStore = await cookies();
    cookieStore.delete("access_token");
    cookieStore.delete("id_token");
    cookieStore.delete("refresh_token");

    // Accept the logout request with Hydra
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
    
    // Create response with Hydra's redirect_to URL
    const response = NextResponse.redirect(acceptResult.redirect_to);
    
    // Ensure cookies are deleted by setting them to empty with past expiration
    response.cookies.set("access_token", "", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    
    response.cookies.set("id_token", "", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    
    response.cookies.set("refresh_token", "", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("OAuth2 logout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
