"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldCheck, AlertCircle, Loader2 } from "lucide-react";

const getGatewayUrl = () => {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_GATEWAY_URL || "";
};

const getClientId = () => process.env.NEXT_PUBLIC_OAUTH2_CLIENT_ID || "";

export function OAuth2LoginButton() {
  const handleLogin = () => {
    const gatewayUrl = getGatewayUrl();
    const clientId = getClientId();
    if (!clientId) return;

    const state = Math.random().toString(36).substring(7);
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      scope: "openid offline_access email profile",
      redirect_uri: `${gatewayUrl}/auth/callback`,
      state,
    });

    window.location.href = `${gatewayUrl}/oauth2/auth?${params.toString()}`;
  };

  return (
    <Button onClick={handleLogin} className="w-full">
      <ShieldCheck className="h-4 w-4 mr-2" />
      Login with OAuth2
    </Button>
  );
}

export function AutoOAuth2Login({ returnTo }: { returnTo?: string }) {
  useEffect(() => {
    const gatewayUrl = getGatewayUrl();
    const clientId = getClientId();
    if (!clientId) return;

    const state = returnTo || "/dashboard";
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      scope: "openid offline_access email profile",
      redirect_uri: `${gatewayUrl}/auth/callback`,
      state: encodeURIComponent(state),
    });

    window.location.href = `${gatewayUrl}/oauth2/auth?${params.toString()}`;
  }, [returnTo]);

  const clientId = getClientId();

  if (!clientId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Configuration Error
            </CardTitle>
            <CardDescription>OAuth2 is not set up correctly</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <code className="text-xs">NEXT_PUBLIC_OAUTH2_CLIENT_ID</code> is
                not configured. Please set this environment variable.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-xs text-center">
        <CardHeader>
          <div className="flex justify-center mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground mx-auto">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
          <CardTitle className="text-base">Redirecting to login</CardTitle>
          <CardDescription>Starting secure authentication…</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pb-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    </div>
  );
}
