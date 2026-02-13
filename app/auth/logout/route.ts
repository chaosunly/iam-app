import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const oryUrl = process.env.NEXT_PUBLIC_ORY_SDK_URL;
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();

  // Find the Ory Kratos session cookie
  const sessionCookie = allCookies.find(
    (cookie) =>
      cookie.name.startsWith("ory_kratos_session") ||
      cookie.name.startsWith("ory_session_"),
  );

  // If there's an Ory session, try to logout properly
  if (sessionCookie && oryUrl) {
    try {
      console.log("[Logout] Found Ory session cookie:", sessionCookie.name);

      const logoutResponse = await fetch(
        `${oryUrl}/self-service/logout/browser`,
        {
          headers: {
            Accept: "application/json",
            Cookie: `${sessionCookie.name}=${sessionCookie.value}`,
          },
        },
      );

      if (logoutResponse.ok) {
        const logoutData = await logoutResponse.json();
        console.log("[Logout] Logout flow created");

        // Perform the logout with token
        if (logoutData.logout_token) {
          await fetch(
            `${oryUrl}/self-service/logout?token=${logoutData.logout_token}`,
            {
              method: "GET",
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
      // Continue to clear cookies even if logout fails
    }
  }

  // Create response with redirect
  const response = NextResponse.redirect(new URL("/auth/login", request.url));

  // Clear ALL authentication cookies
  allCookies.forEach((cookie) => {
    if (
      cookie.name.startsWith("ory_") ||
      cookie.name.startsWith("csrf_token_") ||
      cookie.name === "simplelogin_session" ||
      cookie.name === "pending_simplelogin_user"
    ) {
      response.cookies.set(cookie.name, "", {
        maxAge: 0,
        path: "/",
        expires: new Date(0),
      });
    }
  });

  console.log("✅ User logged out - All authentication cookies cleared");

  return response;
}
