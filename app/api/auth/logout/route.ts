import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

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

    // Create response and redirect to home page
    const response = NextResponse.redirect(new URL("/", request.url));

    // Clear all ory-related cookies
    allCookies.forEach((cookie) => {
      if (
        cookie.name.startsWith("ory_") ||
        cookie.name.startsWith("csrf_token_")
      ) {
        response.cookies.set(cookie.name, "", {
          maxAge: 0,
          path: "/",
          expires: new Date(0),
        });
      }
    });

    console.log("[Logout] Cookies cleared, redirecting to home");
    return response;
  } catch (error) {
    console.error("Logout error:", error);
    // Even if there's an error, redirect to home and clear cookies
    const response = NextResponse.redirect(new URL("/", request.url));
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    allCookies.forEach((cookie) => {
      if (
        cookie.name.startsWith("ory_") ||
        cookie.name.startsWith("csrf_token_")
      ) {
        response.cookies.set(cookie.name, "", {
          maxAge: 0,
          path: "/",
          expires: new Date(0),
        });
      }
    });
    return response;
  }
}

export async function GET(request: NextRequest) {
  // Redirect GET requests to POST (for direct link access)
  return POST(request);
}
