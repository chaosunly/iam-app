"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type CreateClientResponse = {
  success: boolean;
  client?: {
    client_id?: string;
    redirect_uris?: string[];
    scope?: string;
  };
  credentials?: {
    client_id: string;
    client_secret: string;
  };
  error?: string;
};

export default function AdminClientCreatePage() {
  const [clientId, setClientId] = useState("iam-app");
  const [clientName, setClientName] = useState("IAM UI App");
  const [clientSecret, setClientSecret] = useState("");
  const [redirectUris, setRedirectUris] = useState(
    "https://gateway-sengly-branch.up.railway.app/auth/callback",
  );
  const [scope, setScope] = useState("openid offline_access email profile");
  const [skipConsent, setSkipConsent] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [result, setResult] = useState<CreateClientResponse | null>(null);

  const maskedSecret = "........";

  const authUrl = useMemo(() => {
    const firstRedirect = redirectUris
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)[0];

    if (!clientId || !firstRedirect) {
      return "";
    }

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      scope,
      redirect_uri: firstRedirect,
      state: "from-admin-client-page",
    });

    return `/oauth2/auth?${params.toString()}`;
  }, [clientId, redirectUris, scope]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    setCopyMessage("");
    setResult(null);

    try {
      const response = await fetch("/api/admin/create-client", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: clientId.trim(),
          client_name: clientName.trim(),
          client_secret: clientSecret.trim() || undefined,
          redirect_uris: redirectUris
            .split("\n")
            .map((uri) => uri.trim())
            .filter(Boolean),
          scope: scope.trim(),
          grant_types: ["authorization_code", "refresh_token"],
          response_types: ["code"],
          token_endpoint_auth_method: "client_secret_post",
          skip_consent: skipConsent,
        }),
      });

      const data = (await response.json()) as CreateClientResponse;

      if (!response.ok) {
        setError(data.error || "Failed to create client");
        return;
      }

      setResult(data);
      setClientSecret(data.credentials?.client_secret || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onCopySecret() {
    const secret = result?.credentials?.client_secret;
    if (!secret) {
      setCopyMessage("No secret available to copy.");
      return;
    }

    try {
      await navigator.clipboard.writeText(secret);
      setCopyMessage("Secret copied.");
    } catch {
      setCopyMessage("Failed to copy secret.");
    }
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Create OAuth2 Client</h1>
          <p className="text-muted-foreground mt-1">
            Create a Hydra OAuth2 client for applications like IAM UI, Element,
            or other services.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/client">Back to Clients</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">Client ID</label>
              <Input
                required
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="my-app"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Client Name</label>
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="My Application"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Client Secret (leave empty to auto-generate)
              </label>
              <Input
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="my-super-secret-secret"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Redirect URIs (one per line)
              </label>
              <textarea
                required
                value={redirectUris}
                onChange={(e) => setRedirectUris(e.target.value)}
                className="w-full min-h-28 rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="https://gateway.example.com/auth/callback"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Scope</label>
              <Input
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                placeholder="openid offline_access email profile"
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={skipConsent}
                onChange={(e) => setSkipConsent(e.target.checked)}
              />
              Skip consent for first-party app
            </label>

            {error && (
              <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {result?.success && (
              <div className="space-y-3 rounded-md border border-green-300 bg-green-50 p-3 text-sm">
                <p className="font-medium text-green-800">
                  Client created successfully.
                </p>
                <p>
                  <span className="font-medium">Client ID:</span>{" "}
                  {result.credentials?.client_id}
                </p>
                <div className="flex items-center gap-2">
                  <p className="break-all">
                    <span className="font-medium">Client Secret:</span>{" "}
                    {maskedSecret}
                  </p>
                  <Button type="button" variant="ghost" size="sm" onClick={onCopySecret}>
                    Copy
                  </Button>
                </div>
                {copyMessage && <p className="text-xs text-green-800">{copyMessage}</p>}
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Client"}
              </Button>
              {authUrl && (
                <a
                  href={authUrl}
                  className="text-sm text-blue-700 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Test authorization URL
                </a>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
