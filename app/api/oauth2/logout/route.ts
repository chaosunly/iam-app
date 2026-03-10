/**
 * OAuth2 Logout Handler
 * Hydra redirects here when user initiates logout
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const HYDRA_ADMIN_URL =
  process.env.HYDRA_ADMIN_URL || "http://hydra.railway.internal:4445";

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
    const searchParams = request.nextUrl.searchParams;
    const logout_challenge = searchParams.get("logout_challenge");

    // Get gateway URL
    const forwardedHost = request.headers.get("x-forwarded-host");
    const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
    const host = forwardedHost || request.nextUrl.hostname;
    const gatewayUrl = forwardedHost
      ? `${forwardedProto}://${forwardedHost}`
      : `${request.nextUrl.protocol}//${request.nextUrl.host}`;

    if (!logout_challenge) {
      return NextResponse.json(
        { error: "logout_challenge is required" },
        { status: 400 },
      );
    }

    // Accept the logout request with Hydra
    const acceptResponse = await fetch(
      `${HYDRA_ADMIN_URL}/admin/oauth2/auth/requests/logout/accept?logout_challenge=${logout_challenge}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!acceptResponse.ok) {
      const errorText = await acceptResponse.text();
      console.error("Failed to accept logout:", errorText);
      return NextResponse.json(
        { error: "Failed to accept logout" },
        { status: 500 },
      );
    }

    const acceptResult = await acceptResponse.json();

    const response = NextResponse.redirect(acceptResult.redirect_to);

    // Read all current cookies so we can clear them
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

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
    console.error("OAuth2 logout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
