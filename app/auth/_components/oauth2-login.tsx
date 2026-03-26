"use client";

import { useEffect } from "react";

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

// Get OAuth2 client ID with fallback
const getClientId = () => {
  return process.env.NEXT_PUBLIC_OAUTH2_CLIENT_ID || "";
};

export function OAuth2LoginButton() {
  const handleLogin = () => {
    const authBaseUrl = getAuthBaseUrl();
    const clientId = getClientId();
    
    if (!clientId) {
      console.error("OAuth2 Client ID not configured");
      return;
    }
    
    // Generate random state for CSRF protection
    const state = Math.random().toString(36).substring(7);
    
    // Build authorize URL
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
    <button
      onClick={handleLogin}
      className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
    >
      Login with OAuth2
    </button>
  );
}

export function AutoOAuth2Login({ returnTo }: { returnTo?: string }) {
  useEffect(() => {
    const authBaseUrl = getAuthBaseUrl();
    const clientId = getClientId();
    
    console.log("[AutoOAuth2Login] Starting", { authBaseUrl, clientId, returnTo });
    
    if (!clientId) {
      console.error("OAuth2 Client ID not configured");
      return;
    }
    
    // Generate random state
    const state = returnTo || "/dashboard";
    
    // Build authorize URL
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      scope: "openid offline_access email profile",
      redirect_uri: `${authBaseUrl}/auth/callback`,
      state,
    });

    const authorizeUrl = `${authBaseUrl}/oauth2/auth?${params.toString()}`;
    console.log("[AutoOAuth2Login] Redirecting to:", authorizeUrl);

    // Auto-redirect to Hydra
    window.location.href = authorizeUrl;
  }, [returnTo]);

  const clientId = getClientId();
  
  if (!clientId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md p-6 bg-red-50 rounded-lg border border-red-200">
          <h2 className="text-lg font-semibold text-red-900 mb-2">Configuration Error</h2>
          <p className="text-sm text-red-700">
            OAuth2 Client ID is not configured. Please set NEXT_PUBLIC_OAUTH2_CLIENT_ID environment variable.
          </p>
          <div className="mt-4 text-xs text-red-600 font-mono">
            current NEXT_PUBLIC_OAUTH2_CLIENT_ID: {process.env.NEXT_PUBLIC_OAUTH2_CLIENT_ID || "undefined"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to login...</p>
        <p className="text-xs text-gray-400 mt-2">Starting OAuth2 flow...</p>
      </div>
    </div>
  );
}
