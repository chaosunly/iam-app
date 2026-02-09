import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  const oryUrl = process.env.NEXT_PUBLIC_ORY_SDK_URL;

  if (!oryUrl) {
    return NextResponse.json(
      { error: "Ory SDK URL not configured" },
      { status: 500 }
    );
  }

  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("ory_session_festive_brahmagupta");

    // If there's a session, try to create logout flow
    if (sessionCookie) {
      try {
        const logoutResponse = await fetch(
          `${oryUrl}/self-service/logout/browser`,
          {
            headers: {
              Accept: "application/json",
              Cookie: `${sessionCookie.name}=${sessionCookie.value}`,
            },
          }
        );

        if (logoutResponse.ok) {
          const logoutData = await logoutResponse.json();
          
          // Perform the logout with token
          if (logoutData.logout_token) {
            await fetch(`${oryUrl}/self-service/logout?token=${logoutData.logout_token}`, {
              method: "GET",
              headers: {
                Cookie: `${sessionCookie.name}=${sessionCookie.value}`,
              },
            });
          }
        }
      } catch (logoutError) {
        console.error("Logout flow error:", logoutError);
        // Continue to clear cookies even if logout fails
      }
    }

    // Create response and clear cookies
    const response = NextResponse.redirect(new URL("/", request.url));
    
    // Clear all ory-related cookies
    const allCookies = cookieStore.getAll();
    allCookies.forEach((cookie) => {
      if (cookie.name.startsWith("ory_")) {
        response.cookies.delete(cookie.name);
      }
    });

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    // Even if there's an error, redirect to home and clear cookies
    const response = NextResponse.redirect(new URL("/", request.url));
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    allCookies.forEach((cookie) => {
      if (cookie.name.startsWith("ory_")) {
        response.cookies.delete(cookie.name);
      }
    });
    return response;
  }
}

export async function GET(request: NextRequest) {
  // Redirect GET requests to POST
  return NextResponse.redirect(new URL("/", request.url));
}
