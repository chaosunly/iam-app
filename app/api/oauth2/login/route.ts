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

    // -------------------------------------------------------
    // Check which client initiated this login request
    // -------------------------------------------------------
    const loginRequestRes = await fetch(
      `${HYDRA_ADMIN_URL}/admin/oauth2/auth/requests/login?login_challenge=${login_challenge}`
    );

    if (!loginRequestRes.ok) {
      const errorText = await loginRequestRes.text();
      console.error("Failed to fetch login request:", errorText);
      return NextResponse.json({ error: "Failed to fetch login request" }, { status: 500 });
    }

    const loginRequest = await loginRequestRes.json();
    const clientId = loginRequest.client?.client_id;

    console.info("/api/oauth2/login client check", { clientId, skip: loginRequest.skip, subject: loginRequest.subject });

    // Handle all clients the same way: check for Kratos session, accept login or redirect to Kratos
    const session = await getServerSession();

    if (session?.identity) {
      const kratosIdentity = session.identity;

      // When Hydra says skip=true it has a cached login session for loginRequest.subject.
      // If that cached subject doesn't match the current Kratos user (account switch),
      // Hydra will IGNORE any new subject we send and return the cached user (e.g. penghout).
      // Fix: revoke the stale Hydra session and restart the flow so Hydra issues a fresh
      // login_challenge with skip=false, at which point we can accept with the correct user.
      if (loginRequest.skip && loginRequest.subject && loginRequest.subject !== kratosIdentity.id) {
        console.info("/api/oauth2/login: skip=true but subject mismatch — revoking stale Hydra session", {
          cachedSubject: loginRequest.subject,
          currentSubject: kratosIdentity.id,
        });

        // Revoke all Hydra login sessions for the stale cached user
        await fetch(
          `${HYDRA_ADMIN_URL}/admin/oauth2/auth/sessions/login?subject=${encodeURIComponent(loginRequest.subject)}`,
          { method: "DELETE" }
        ).catch((e) => console.warn("Failed to revoke stale login session:", e));

        // Restart the authorization flow with prompt=login to get a fresh challenge
        const restartUrl = new URL(loginRequest.request_url);
        restartUrl.searchParams.set("prompt", "login");
        console.info("/api/oauth2/login: redirecting to restart auth flow", { url: restartUrl.toString() });
        return NextResponse.redirect(restartUrl.toString());
      }

      // Extract user data from Kratos identity for Hydra id_token
      const userEmail = kratosIdentity.traits?.email || "";
      const userName = kratosIdentity.traits?.username || kratosIdentity.traits?.preferred_username || kratosIdentity.id;
      const userDisplayName = kratosIdentity.traits?.name || kratosIdentity.traits?.given_name || userName;

      console.info("/api/oauth2/login accepting with identity data", {
        userId: kratosIdentity.id,
        email: userEmail,
        username: userName,
        displayName: userDisplayName,
      });

      // Accept the login in Hydra, passing identity context for id_token claims
      const acceptResponse = await fetch(
        `${HYDRA_ADMIN_URL}/admin/oauth2/auth/requests/login/accept?login_challenge=${login_challenge}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: kratosIdentity.id,
            remember: false,
            remember_for: 0,
            // Pass Kratos identity data as context for Hydra to include in id_token.
            // Also store the original auth request hostname so the consent handler
            // can apply the same CSRF cookie domain routing logic.
            context: {
              email: userEmail,
              username: userName,
              preferred_username: userName,
              name: userDisplayName,
              _hydra_origin_hostname: new URL(loginRequest.request_url).hostname,
            },
            acr: "urn:mace:incommon:iap:silver", // Authentication context class reference
          }),
        }
      );

      if (!acceptResponse.ok) {
        const errorText = await acceptResponse.text();
        console.error("Failed to accept login:", errorText);
        return NextResponse.json({ error: "Failed to accept login" }, { status: 500 });
      }

      const acceptResult = await acceptResponse.json();

      // Route the login_verifier redirect to whichever host the browser has the
      // Hydra CSRF cookie on. Hydra sets its CSRF cookie on the Host of the original
      // auth request:
      //   - Normal browser flow: auth goes through the gateway → CSRF on gateway domain
      //     → rewrite redirect_to to gateway so the cookie is sent back.
      //   - Polis/SAML SSO flow: Polis calls Hydra directly → CSRF on Hydra's own domain
      //     → if redirect_to is pointing at the gateway (due to SERVE_PUBLIC_BASE_URL),
      //     rewrite it back to Hydra's direct URL so the cookie is sent back.
      const NGINX_URL = (process.env.NGINX_URL || "").replace(/\/$/, "");
      let redirectTo = acceptResult.redirect_to as string;
      if (NGINX_URL && redirectTo) {
        try {
          const nginxUrl = new URL(NGINX_URL);
          const requestOriginUrl = new URL(loginRequest.request_url);
          const url = new URL(redirectTo);

          if (url.pathname.startsWith("/oauth2/")) {
            if (requestOriginUrl.hostname === nginxUrl.hostname) {
              // Auth came through gateway → redirect_to must go through gateway
              if (url.hostname !== nginxUrl.hostname) {
                url.hostname = nginxUrl.hostname;
                url.protocol = nginxUrl.protocol;
                url.port = nginxUrl.port;
                redirectTo = url.toString();
              }
            } else {
              // Auth came directly to Hydra (e.g. Polis SSO) → redirect_to must go
              // directly to Hydra so the browser sends the CSRF cookie (set on Hydra's domain)
              if (url.hostname === nginxUrl.hostname) {
                url.hostname = requestOriginUrl.hostname;
                url.protocol = requestOriginUrl.protocol;
                url.port = requestOriginUrl.port;
                redirectTo = url.toString();
              }
            }
          }
        } catch {
          // keep original if URL parsing fails
        }
      }

      const response = NextResponse.redirect(redirectTo);
      response.cookies.delete("oauth2_login_challenge");
      return response;
    }

    // No Kratos session: store challenge and send to Kratos login
    const configuredAppUrl = (
      process.env.AUTH_PUBLIC_URL || process.env.NEXT_PUBLIC_APP_URL || ""
    ).replace(/\/$/, "");
    const appUrl = configuredAppUrl || request.nextUrl.origin;
    const returnToUrl = `${appUrl}/api/oauth2/login?login_challenge=${login_challenge}`;

    console.info("/api/oauth2/login redirecting to Kratos", { appUrl, returnToUrl });

    const response = NextResponse.redirect(
      `${appUrl}/.ory/self-service/login/browser?return_to=${encodeURIComponent(returnToUrl)}`
    );
    response.cookies.set("oauth2_login_challenge", login_challenge, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 600,
      path: "/",
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
