"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldCheck, AlertCircle, ArrowRight } from "lucide-react";

const normalizeBaseUrl = (url: string) => url.replace(/\/$/, "");

// Use configured auth base URL first to avoid domain drift in mixed proxy setups.
const getAuthBaseUrl = () => {
  const configuredUrl =
    process.env.NEXT_PUBLIC_AUTH_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_GATEWAY_URL;

  if (configuredUrl) {
    return normalizeBaseUrl(configuredUrl);
  }

  if (typeof window !== "undefined") {
    return normalizeBaseUrl(window.location.origin);
  }

  return "";
};

const getClientId = () => process.env.NEXT_PUBLIC_OAUTH2_CLIENT_ID || "";

export function OAuth2LoginButton() {
  const handleLogin = () => {
    const authBaseUrl = getAuthBaseUrl();
    const clientId = getClientId();
    if (!clientId) return;

    const state = Math.random().toString(36).substring(7);
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      scope: "openid offline_access email profile",
      redirect_uri: `${authBaseUrl}/auth/callback`,
      state: state,
    });

    // Redirect to Hydra
    window.location.href = `${authBaseUrl}/oauth2/auth?${params.toString()}`;
  };

  return (
    <Button onClick={handleLogin} className="w-full">
      <ShieldCheck className="h-4 w-4 mr-2" />
      Login with OAuth2
    </Button>
  );
}

export function AutoOAuth2Login({ returnTo }: { returnTo?: string }) {
  const [showFallback, setShowFallback] = useState(false);
  const [dots, setDots] = useState(1);

  useEffect(() => {
    const authBaseUrl = getAuthBaseUrl();
    const clientId = getClientId();

    console.log("[AutoOAuth2Login] Starting", {
      authBaseUrl,
      clientId,
      returnTo,
    });

    if (!clientId) {
      console.error("OAuth2 Client ID not configured");
      return;
    }

    // Generate random state
    const state = returnTo || "/dashboard";
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      scope: "openid offline_access email profile",
      redirect_uri: `${authBaseUrl}/auth/callback`,
      state,
    });

    const authorizeUrl = `${authBaseUrl}/oauth2/auth?${params.toString()}`;
    console.log("[AutoOAuth2Login] Redirecting to:", authorizeUrl);

    // Animate dots while waiting
    const dotsInterval = setInterval(() => {
      setDots((d) => (d % 3) + 1);
    }, 400);

    // Show manual button after 3 s in case the redirect stalls
    const timer = setTimeout(() => {
      setShowFallback(true);
      clearInterval(dotsInterval);
    }, 3000);

    // Auto-redirect
    window.location.href = authorizeUrl;

    return () => {
      clearTimeout(timer);
      clearInterval(dotsInterval);
    };
  }, [returnTo]);

  const clientId = getClientId();

  if (!clientId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm rounded-2xl border bg-card p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm font-semibold">Configuration Error</p>
              <p className="text-xs text-muted-foreground">
                OAuth2 is not set up correctly
              </p>
            </div>
          </div>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <code className="text-xs">NEXT_PUBLIC_OAUTH2_CLIENT_ID</code> is
              not configured. Please set this environment variable.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const handleManualRedirect = () => {
    const authBaseUrl = getAuthBaseUrl();
    const cId = getClientId();
    if (!cId) return;
    const state = returnTo || "/dashboard";
    const params = new URLSearchParams({
      client_id: cId,
      response_type: "code",
      scope: "openid offline_access email profile",
      redirect_uri: `${authBaseUrl}/auth/callback`,
      state: encodeURIComponent(state),
    });
    window.location.href = `${authBaseUrl}/oauth2/auth?${params.toString()}`;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-b from-background to-muted/30 px-4">
      <div className="w-full max-w-xs space-y-6 text-center">
        {/* Animated shield icon */}
        <div className="flex justify-center">
          <div className="relative">
            {/* Outer pulse ring */}
            {!showFallback && (
              <span className="absolute inset-0 rounded-2xl bg-primary/20 animate-ping" />
            )}
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
              <ShieldCheck className="h-8 w-8" />
            </div>
          </div>
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight">
            {showFallback ? "Ready to sign in" : "Redirecting to login"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {showFallback
              ? "Click below to continue to secure authentication"
              : `Starting secure authentication${".".repeat(dots)}`}
          </p>
        </div>

        {/* Progress / Action */}
        {showFallback ? (
          <Button
            onClick={handleManualRedirect}
            className="w-full gap-2"
            size="lg"
          >
            Continue to sign in
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <div className="flex justify-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-2 w-2 rounded-full bg-primary transition-all duration-300"
                style={{
                  opacity: dots > i ? 1 : 0.25,
                  transform: dots > i ? "scale(1.2)" : "scale(1)",
                }}
              />
            ))}
          </div>
        )}

        {/* Footer note */}
        <p className="text-xs text-muted-foreground/60">
          Secured with end-to-end encryption
        </p>
      </div>
    </div>
  );
}
