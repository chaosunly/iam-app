"use client";

import { useEffect } from "react";

// Use window.location.origin as fallback for gateway URL
const getGatewayUrl = () => {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_GATEWAY_URL || "https://gateway-testing-7bcc.up.railway.app";
};

const OAUTH2_CLIENT_ID = process.env.NEXT_PUBLIC_OAUTH2_CLIENT_ID || "ac90875e-fd72-46f9-a761-75686ba1ab76";

export function OAuth2LoginButton() {
  const handleLogin = () => {
    const gatewayUrl = getGatewayUrl();
    
    // Generate random state for CSRF protection
    const state = Math.random().toString(36).substring(7);
    
    // Build authorize URL
    const params = new URLSearchParams({
      client_id: OAUTH2_CLIENT_ID,
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
    
    // Generate random state
    const state = returnTo || "/dashboard";
    
    // Build authorize URL
    const params = new URLSearchParams({
      client_id: OAUTH2_CLIENT_ID,
      response_type: "code",
      scope: "openid offline_access email profile",
      redirect_uri: `${gatewayUrl}/auth/callback`,
      state: encodeURIComponent(state),
    });

    // Auto-redirect to Hydra
    window.location.href = `${gatewayUrl}/oauth2/auth?${params.toString()}`;
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

        <p className="text-gray-600">Redirecting to login...</p>
      </div>
    </div>
  );
}
