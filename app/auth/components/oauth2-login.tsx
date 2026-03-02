"use client";

import { useEffect } from "react";

const HYDRA_AUTHORIZE_URL = `${process.env.NEXT_PUBLIC_GATEWAY_URL}/oauth2/auth`;
const OAUTH2_CLIENT_ID = process.env.NEXT_PUBLIC_OAUTH2_CLIENT_ID;
const OAUTH2_REDIRECT_URI = `${process.env.NEXT_PUBLIC_GATEWAY_URL}/auth/callback`;

export function OAuth2LoginButton() {
  const handleLogin = () => {
    // Generate random state for CSRF protection
    const state = Math.random().toString(36).substring(7);
    
    // Build authorize URL
    const params = new URLSearchParams({
      client_id: OAUTH2_CLIENT_ID!,
      response_type: "code",
      scope: "openid offline_access email profile",
      redirect_uri: OAUTH2_REDIRECT_URI,
      state: state,
    });

    // Redirect to Hydra
    window.location.href = `${HYDRA_AUTHORIZE_URL}?${params.toString()}`;
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
    // Generate random state
    const state = returnTo || "/dashboard";
    
    // Build authorize URL
    const params = new URLSearchParams({
      client_id: OAUTH2_CLIENT_ID!,
      response_type: "code",
      scope: "openid offline_access email profile",
      redirect_uri: OAUTH2_REDIRECT_URI,
      state: encodeURIComponent(state),
    });

    // Auto-redirect to Hydra
    window.location.href = `${HYDRA_AUTHORIZE_URL}?${params.toString()}`;
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
