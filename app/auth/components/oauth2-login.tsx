"use client";

import { useEffect } from "react";

// Get gateway URL dynamically at runtime
const getGatewayUrl = () => {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_GATEWAY_URL || "";
};

// Get OAuth2 client ID with fallback
const getClientId = () => {
  return process.env.NEXT_PUBLIC_OAUTH2_CLIENT_ID || "";
};

export function OAuth2LoginButton() {
  const handleLogin = () => {
    const gatewayUrl = getGatewayUrl();
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
      redirect_uri: `${gatewayUrl}/auth/callback`,
      state: state,
    });

    // Redirect to Hydra
    window.location.href = `${gatewayUrl}/oauth2/auth?${params.toString()}`;
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
    const gatewayUrl = getGatewayUrl();
    const clientId = getClientId();
    
    console.log("[AutoOAuth2Login] Starting", { gatewayUrl, clientId, returnTo });
    
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
      redirect_uri: `${gatewayUrl}/auth/callback`,
      state: encodeURIComponent(state),
    });

    const authorizeUrl = `${gatewayUrl}/oauth2/auth?${params.toString()}`;
    console.log("[AutoOAuth2Login] Redirecting to:", authorizeUrl);

    // Auto-redirect to Hydra
    window.location.href = authorizeUrl;
  }, [returnTo]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to login...</p>
      </div>
    </div>
  );
}
