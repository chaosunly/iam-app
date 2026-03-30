/**
 * OAuth2 Login Handler
 * Hydra redirects here when user needs to authenticate.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@ory/nextjs/app";

const HYDRA_ADMIN_URL = process.env.HYDRA_ADMIN_URL || "http://hydra.railway.internal:4445";

export async function GET(request: NextRequest) {
  try {
    console.info("/api/oauth2/login start", {
      url: request.nextUrl.toString(),
      cookies: request.cookies.getAll().map((c) => c.name),
      query: Object.fromEntries(request.nextUrl.searchParams.entries()),
    });

    const searchParams = request.nextUrl.searchParams;
    let login_challenge = searchParams.get("login_challenge");

    // If missing in query, try cookie
    if (!login_challenge) {
      login_challenge = request.cookies.get("oauth2_login_challenge")?.value || null;
    }

    if (!login_challenge) {
      const cookies = request.cookies.getAll().map((c) => c.name);
      console.error("login_challenge missing", {
        hasCookie: Boolean(request.cookies.get("oauth2_login_challenge")),
        cookieDomain: request.nextUrl.hostname,
        cookies,
      });
      const res = NextResponse.json(
        { error: "login_challenge is required", cookies, url: request.nextUrl.toString() },
        { status: 400 }
      );
      res.headers.set("X-Debug-Login-Challenge", "missing");
      return res;
    }

    const session = await getServerSession();

    if (session?.identity) {
      // Accept the login in Hydra using the Kratos identity id
      const acceptResponse = await fetch(
        `${HYDRA_ADMIN_URL}/admin/oauth2/auth/requests/login/accept?login_challenge=${login_challenge}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: session.identity.id,
            remember: true,
            remember_for: 3600,
          }),
        }
      );

      if (!acceptResponse.ok) {
        const errorText = await acceptResponse.text();
        console.error("Failed to accept login:", errorText);
        return NextResponse.json({ error: "Failed to accept login" }, { status: 500 });
      }

      const acceptResult = await acceptResponse.json();

      // Rewrite Hydra's public-domain redirect_to through nginx so the CSRF cookie
      // (set on nginx-sengly via proxy) is included in the return request to Hydra.
      const NGINX_URL = (process.env.NGINX_URL || "").replace(/\/$/, "");
      let redirectTo = acceptResult.redirect_to as string;
      if (NGINX_URL && redirectTo) {
        try {
          const url = new URL(redirectTo);
          const nginxUrl = new URL(NGINX_URL);
          if (url.pathname.startsWith("/oauth2/") && url.hostname !== nginxUrl.hostname) {
            url.hostname = nginxUrl.hostname;
            url.protocol = nginxUrl.protocol;
            url.port = nginxUrl.port;
            redirectTo = url.toString();
          }
        } catch {
          // keep original if URL parsing fails
        }
      }

      const response = NextResponse.redirect(redirectTo);
      response.cookies.delete("oauth2_login_challenge");
      return response;
    }

    // No Kratos session: store challenge and send to Kratos login.
    // Use NEXT_PUBLIC_APP_URL so the return_to always uses the correct public HTTPS URL.
    // Reconstructing from x-forwarded-proto is unreliable because Oathkeeper proxies
    // to the UI over HTTP internally, which can cause the header to arrive as "http".
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
    const returnToUrl = `${appUrl}/api/oauth2/login?login_challenge=${login_challenge}`;

    console.info("/api/oauth2/login redirecting to Kratos", { appUrl, returnToUrl });

    const response = NextResponse.redirect(
      `${appUrl}/.ory/self-service/login/browser?return_to=${encodeURIComponent(returnToUrl)}`
    );

    response.cookies.set("oauth2_login_challenge", login_challenge, {
      httpOnly: true,
      secure: true,
      sameSite: "none", // allow cross-site redirects back from SimpleLogin
      maxAge: 600,
      path: "/",
      // No explicit domain to stick to current host; avoids mismatch
    });

    console.info("/api/oauth2/login set cookie", {
      login_challenge,
      domain: request.nextUrl.hostname,
      returnToUrl,
    });

    return response;
  } catch (error) {
    console.error("OAuth2 login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
