/**
 * Logout Initiation Endpoint
 * Call this to start the logout process
 * Clears OAuth2 tokens and redirects to Kratos logout
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// Appends two Set-Cookie headers to clear a cookie:
// 1. Without domain — removes host-only cookies (set without Domain attribute)
// 2. With explicit domain — removes cookies Ory services set with a Domain attribute
//    (e.g. ory_kratos_session uses Domain=.<host>)
function appendClearCookieHeaders(
  response: NextResponse,
  name: string,
  host: string,
): void {
  const expires = "Thu, 01 Jan 1970 00:00:00 GMT";
  response.headers.append(
    "Set-Cookie",
    `${name}=; Max-Age=0; Path=/; Expires=${expires}`,
  );
  response.headers.append(
    "Set-Cookie",
    `${name}=; Max-Age=0; Path=/; Domain=${host}; Expires=${expires}`,
  );
}

export async function GET(request: NextRequest) {
  try {
    // Get gateway URL
    const forwardedHost = request.headers.get("x-forwarded-host");
    const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
    const host = forwardedHost || request.nextUrl.hostname;
    const gatewayUrl = forwardedHost
      ? `${forwardedProto}://${forwardedHost}`
      : `${request.nextUrl.protocol}//${request.nextUrl.host}`;

    // Read all cookies so we can clear them
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    // Redirect through Ory's browser logout flow so Kratos clears ory_kratos_session
    // with the correct domain attribute, then returns to the login page.
    const kratosLogoutUrl = `${gatewayUrl}/.ory/self-service/logout/browser?return_to=${encodeURIComponent(
      `${gatewayUrl}/auth/login`,
    )}`;

    const response = NextResponse.redirect(kratosLogoutUrl);

    // Clear all auth cookies. Each cookie is cleared twice:
    //   • without Domain — deletes host-only cookies
    //   • with Domain=<host> — deletes cookies set with an explicit Domain attribute
    allCookies.forEach((cookie) => {
      if (
        cookie.name.startsWith("ory_") ||
        cookie.name.startsWith("csrf_token_") ||
        cookie.name === "access_token" ||
        cookie.name === "id_token" ||
        cookie.name === "refresh_token" ||
        cookie.name === "oauth2_login_challenge"
      ) {
        appendClearCookieHeaders(response, cookie.name, host);
      }
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
