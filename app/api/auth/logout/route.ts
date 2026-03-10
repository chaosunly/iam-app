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

export async function POST(request: NextRequest) {
  const oryUrl = process.env.NEXT_PUBLIC_ORY_SDK_URL;

  if (!oryUrl) {
    return NextResponse.json(
      { error: "Ory SDK URL not configured" },
      { status: 500 },
    );
  }

  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    // Determine the public-facing host so domain-scoped cookies (e.g. ory_kratos_session
    // which Kratos sets with an explicit Domain attribute) are properly cleared.
    const host =
      request.headers.get("x-forwarded-host") || request.nextUrl.hostname;

    // Find the Ory Kratos session cookie (it can have different names)
    const sessionCookie = allCookies.find(
      (cookie) =>
        cookie.name.startsWith("ory_kratos_session") ||
        cookie.name.startsWith("ory_session_"),
    );

    // If there's a session, try to create logout flow
    if (sessionCookie) {
      try {
        console.log("[Logout] Found session cookie:", sessionCookie.name);

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
          console.log("[Logout] Logout flow created:", logoutData);

          // Perform the logout with token
          if (logoutData.logout_token) {
            const logoutResult = await fetch(
              `${oryUrl}/self-service/logout?token=${logoutData.logout_token}`,
              {
                method: "GET",
                redirect: "manual",
                headers: {
                  Cookie: `${sessionCookie.name}=${sessionCookie.value}`,
                },
              },
            );
            console.log("[Logout] Logout completed:", logoutResult.status);
          }
        }
      } catch (logoutError) {
        console.error("Logout flow error:", logoutError);
        // Continue to clear cookies even if logout fails
      }
    } else {
      console.log("[Logout] No session cookie found");
    }

    const response = NextResponse.redirect(new URL("/auth/login", request.url));

    // Clear all auth cookies. Each cookie is cleared twice:
    //   • without Domain — deletes host-only cookies
    //   • with Domain=<host> — deletes cookies explicitly domain-scoped by Ory services
    //     (e.g. ory_kratos_session uses Domain=.<host>)
    allCookies.forEach((cookie) => {
      if (
        cookie.name.startsWith("ory_") ||
        cookie.name.startsWith("csrf_token_") ||
        cookie.name === "simplelogin_session" ||
        cookie.name === "pending_simplelogin_user" ||
        cookie.name === "access_token" ||
        cookie.name === "id_token" ||
        cookie.name === "refresh_token" ||
        cookie.name === "oauth2_login_challenge"
      ) {
        appendClearCookieHeaders(response, cookie.name, host);
      }
    });

    console.log(
      "[Logout] All authentication cookies cleared, redirecting to login",
    );
    return response;
  } catch (error) {
    console.error("Logout error:", error);
    // Even if there's an error, redirect to login and clear cookies
    const host =
      request.headers.get("x-forwarded-host") || request.nextUrl.hostname;
    const response = NextResponse.redirect(new URL("/auth/login", request.url));
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    allCookies.forEach((cookie) => {
      if (
        cookie.name.startsWith("ory_") ||
        cookie.name.startsWith("csrf_token_") ||
        cookie.name === "simplelogin_session" ||
        cookie.name === "pending_simplelogin_user" ||
        cookie.name === "access_token" ||
        cookie.name === "id_token" ||
        cookie.name === "refresh_token" ||
        cookie.name === "oauth2_login_challenge"
      ) {
        appendClearCookieHeaders(response, cookie.name, host);
      }
    });
    return response;
  }
}

export async function GET(request: NextRequest) {
  // Redirect GET requests to POST (for direct link access)
  return POST(request);
}
