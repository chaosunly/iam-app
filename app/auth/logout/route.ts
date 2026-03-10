import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// Cookie names/prefixes that should be cleared on logout
const AUTH_COOKIE_MATCHERS = [
  (name: string) => name.startsWith("ory_"),
  (name: string) => name.startsWith("csrf_token_"),
  (name: string) => name === "simplelogin_session",
  (name: string) => name === "pending_simplelogin_user",
  (name: string) => name === "access_token",
  (name: string) => name === "id_token",
  (name: string) => name === "refresh_token",
  (name: string) => name === "oauth2_login_challenge",
];

function shouldClearCookie(name: string): boolean {
  return AUTH_COOKIE_MATCHERS.some((matcher) => matcher(name));
}

// Appends two Set-Cookie headers to clear a cookie:
// 1. Without domain — removes host-only cookies (set without Domain attribute)
// 2. With explicit domain — removes cookies set with an explicit Domain (e.g. ory_kratos_session)
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
  const oryUrl = process.env.NEXT_PUBLIC_ORY_SDK_URL;
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();

  // Determine the public-facing host so domain-scoped cookies (e.g. ory_kratos_session
  // which Kratos sets with an explicit Domain attribute) are properly cleared.
  const host =
    request.headers.get("x-forwarded-host") || request.nextUrl.hostname;

  // Find the Ory Kratos session cookie
  const sessionCookie = allCookies.find(
    (cookie) =>
      cookie.name.startsWith("ory_kratos_session") ||
      cookie.name.startsWith("ory_session_"),
  );

  // Invalidate the Kratos session server-side so it cannot be reused even if
  // the cookie somehow persists in the browser.
  if (sessionCookie && oryUrl) {
    try {
      console.log("[Logout] Found Ory session cookie:", sessionCookie.name);

      const logoutResponse = await fetch(
        `${oryUrl}/self-service/logout/browser`,
        {
          redirect: "manual",
          headers: {
            Accept: "application/json",
            Cookie: `${sessionCookie.name}=${sessionCookie.value}`,
          },
        },
      );

      if (logoutResponse.ok) {
        const logoutData = await logoutResponse.json();
        console.log("[Logout] Logout flow created");

        if (logoutData.logout_token) {
          await fetch(
            `${oryUrl}/self-service/logout?token=${logoutData.logout_token}`,
            {
              method: "GET",
              redirect: "manual",
              headers: {
                Cookie: `${sessionCookie.name}=${sessionCookie.value}`,
              },
            },
          );
          console.log("[Logout] Ory session invalidated");
        }
      }
    } catch (logoutError) {
      console.error("[Logout] Ory logout error:", logoutError);
      // Continue to clear cookies even if server-side invalidation fails
    }
  }

  const response = NextResponse.redirect(new URL("/auth/login", request.url));

  // Clear all auth cookies. Each cookie is cleared twice:
  //   • without Domain — deletes host-only cookies
  //   • with Domain=<host> — deletes cookies that were explicitly domain-scoped
  //     by Ory services (e.g. ory_kratos_session uses Domain=.<host>)
  allCookies.forEach((cookie) => {
    if (shouldClearCookie(cookie.name)) {
      appendClearCookieHeaders(response, cookie.name, host);
    }
  });

  console.log("✅ User logged out - All authentication cookies cleared");

  return response;
}
