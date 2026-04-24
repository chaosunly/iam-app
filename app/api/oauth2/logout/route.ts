/**
 * OAuth2 Logout Handler
 * Hydra redirects here when user initiates logout
 */

import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/errors";

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
  return withErrorHandler(async (): Promise<NextResponse> => {
    const searchParams = request.nextUrl.searchParams;
    const logout_challenge = searchParams.get("logout_challenge");

    // Get host for cookie clearing
    const forwardedHost = request.headers.get("x-forwarded-host");
    const host = forwardedHost || request.nextUrl.hostname;

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

    const isProduction = process.env.NODE_ENV === "production";

    // Clear OAuth2 tokens with httpOnly cookies (must match original attributes)
    response.cookies.set("access_token", "", {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    response.cookies.set("id_token", "", {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    response.cookies.set("refresh_token", "", {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    // Also clear with domain variants to handle Ory cookies
    appendClearCookieHeaders(response, "access_token", host);
    appendClearCookieHeaders(response, "id_token", host);
    appendClearCookieHeaders(response, "refresh_token", host);

    return response;
  });
}
