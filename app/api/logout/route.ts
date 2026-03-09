/**
 * Logout Initiation Endpoint
 * Call this to start the logout process
 * Clears OAuth2 tokens and redirects to Kratos logout
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    // Get gateway URL
    const forwardedHost = request.headers.get("x-forwarded-host");
    const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
    const gatewayUrl = forwardedHost
      ? `${forwardedProto}://${forwardedHost}`
      : `${request.nextUrl.protocol}//${request.nextUrl.host}`;

    // Clear OAuth2 token cookies
    const cookieStore = await cookies();
    cookieStore.delete("access_token");
    cookieStore.delete("id_token");
    cookieStore.delete("refresh_token");

    // Create response redirecting to Kratos logout
    // Kratos will clear its session and redirect to return_to
    const kratosLogoutUrl = `${gatewayUrl}/.ory/self-service/logout/browser?return_to=${encodeURIComponent(
      `${gatewayUrl}/auth/login`
    )}`;
    
    const response = NextResponse.redirect(kratosLogoutUrl);
    
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
    console.error("Logout error:", error);
    
    // Fallback: redirect to login even if logout fails
    const forwardedHost = request.headers.get("x-forwarded-host");
    const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
    const gatewayUrl = forwardedHost
      ? `${forwardedProto}://${forwardedHost}`
      : `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    
    return NextResponse.redirect(`${gatewayUrl}/auth/login`);
  }
}

export async function POST(request: NextRequest) {
  // Support POST method as well (useful for forms)
  return GET(request);
}
