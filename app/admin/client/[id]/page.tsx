"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DeleteClientButton } from "../delete-client-button";

type OAuth2Client = {
  client_id?: string;
  client_name?: string;
  client_secret_expires_at?: number;
  grant_types?: string[];
  response_types?: string[];
  scope?: string;
  redirect_uris?: string[];
  token_endpoint_auth_method?: "client_secret_post" | "client_secret_basic" | "none";
  skip_consent?: boolean;
  created_at?: string;
  updated_at?: string;
};

type ClientResponse = {
  client?: OAuth2Client;
  error?: string;
};

type UpdateResponse = {
  success?: boolean;
  client?: OAuth2Client;
  credentials?: {
    client_id: string;
    client_secret: string;
  } | null;
  error?: string;
};

const MASKED_SECRET = "........";

export default function AdminClientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
        ? params.id[0]
        : "";

  const [client, setClient] = useState<OAuth2Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [knownSecret, setKnownSecret] = useState("");

  const [formData, setFormData] = useState({
    client_name: "",
    redirect_uris: "",
    scope: "",
    grant_types: "authorization_code, refresh_token",
    response_types: "code",
    token_endpoint_auth_method: "client_secret_post" as
      | "client_secret_post"
      | "client_secret_basic"
      | "none",
    skip_consent: true,
    client_secret: MASKED_SECRET,
  });

  useEffect(() => {
    if (id) {
      fetchClient();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function fetchClient() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/admin/create-client/${encodeURIComponent(id)}`,
      );
      const data = (await response.json()) as ClientResponse;

      if (!response.ok || !data.client) {
        throw new Error(data.error || "Failed to fetch client");
      }

      const loadedClient = data.client;
      setClient(loadedClient);
      setFormData({
        client_name: loadedClient.client_name || "",
        redirect_uris: (loadedClient.redirect_uris || []).join("\n"),
        scope: loadedClient.scope || "openid offline_access email profile",
        grant_types: (loadedClient.grant_types || []).join(", ") ||
          "authorization_code, refresh_token",
        response_types: (loadedClient.response_types || []).join(", ") || "code",
        token_endpoint_auth_method:
          loadedClient.token_endpoint_auth_method || "client_secret_post",
        skip_consent: loadedClient.skip_consent ?? true,
        client_secret: MASKED_SECRET,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!id) {
      return;
    }

    setSaving(true);
    setError("");
    setCopyMessage("");

    try {
      const response = await fetch(
        `/api/admin/create-client/${encodeURIComponent(id)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            client_name: formData.client_name.trim() || id,
            redirect_uris: formData.redirect_uris
              .split("\n")
              .map((uri) => uri.trim())
              .filter(Boolean),
            scope: formData.scope.trim(),
            grant_types: formData.grant_types
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean),
            response_types: formData.response_types
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean),
            token_endpoint_auth_method: formData.token_endpoint_auth_method,
            skip_consent: formData.skip_consent,
            client_secret:
              formData.client_secret.trim() &&
              formData.client_secret.trim() !== MASKED_SECRET
                ? formData.client_secret.trim()
                : undefined,
          }),
        },
      );

      const data = (await response.json()) as UpdateResponse;
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to update client");
      }

      if (data.credentials?.client_secret) {
        setKnownSecret(data.credentials.client_secret);
        setCopyMessage("New secret saved. Use Copy to copy it.");
      }

      setEditing(false);
      await fetchClient();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setSaving(false);
    }
  }

  async function copySecret() {
    const valueToCopy =
      formData.client_secret && formData.client_secret !== MASKED_SECRET
        ? formData.client_secret
        : knownSecret;

    if (!valueToCopy) {
      setCopyMessage("Set a new secret first, then save to copy it.");
      return;
    }

    try {
      await navigator.clipboard.writeText(valueToCopy);
      setCopyMessage("Secret copied.");
    } catch {
      setCopyMessage("Failed to copy secret.");
    }
  }

  if (!id) {
    return (
      <div className="p-6 md:p-8">
        <p className="text-destructive">Invalid client ID</p>
        <Button asChild variant="ghost" size="sm" className="mt-2">
          <Link href="/admin/client">Back to clients</Link>
        </Button>
      </div>
    );
  }

  if (loading && !client) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-muted border-t-foreground rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading client...</p>
        </div>
      </div>
    );
  }

  if (error && !client) {
    return (
      <div className="p-6 md:p-8">
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
        <Button asChild variant="ghost" size="sm" className="mt-2">
          <Link href="/admin/client">Back to clients</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2">Client Details</h2>
          <p className="text-muted-foreground">{client?.client_id}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/client">Back</Link>
          </Button>
          {!editing && (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              Edit
            </Button>
          )}
          {client?.client_id && (
            <DeleteClientButton
              clientId={client.client_id}
              onDeleted={() => router.push("/admin/client")}
            />
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{client?.client_name || client?.client_id || "Client"}</CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <form onSubmit={handleSave} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium">Client Name</label>
                <Input
                  value={formData.client_name}
                  onChange={(e) =>
                    setFormData({ ...formData, client_name: e.target.value })
                  }
                  placeholder="IAM UI App"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Redirect URIs (one per line)
                </label>
                <textarea
                  required
                  value={formData.redirect_uris}
                  onChange={(e) =>
                    setFormData({ ...formData, redirect_uris: e.target.value })
                  }
                  className="w-full min-h-28 rounded-md border bg-background px-3 py-2 text-sm"
                  placeholder="https://gateway.example.com/auth/callback"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Scope</label>
                <Input
                  value={formData.scope}
                  onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                  placeholder="openid offline_access email profile"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Grant Types (comma separated)
                  </label>
                  <Input
                    value={formData.grant_types}
                    onChange={(e) =>
                      setFormData({ ...formData, grant_types: e.target.value })
                    }
                    placeholder="authorization_code, refresh_token"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Response Types (comma separated)
                  </label>
                  <Input
                    value={formData.response_types}
                    onChange={(e) =>
                      setFormData({ ...formData, response_types: e.target.value })
                    }
                    placeholder="code"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Token Auth Method</label>
                  <select
                    value={formData.token_endpoint_auth_method}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        token_endpoint_auth_method: e.target.value as
                          | "client_secret_post"
                          | "client_secret_basic"
                          | "none",
                      })
                    }
                    className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="client_secret_post">client_secret_post</option>
                    <option value="client_secret_basic">client_secret_basic</option>
                    <option value="none">none</option>
                  </select>
                </div>

                <label className="flex items-center gap-2 text-sm pt-7">
                  <input
                    type="checkbox"
                    checked={formData.skip_consent}
                    onChange={(e) =>
                      setFormData({ ...formData, skip_consent: e.target.checked })
                    }
                  />
                  Skip consent
                </label>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Client Secret (masked, enter a new one to rotate)
                </label>
                <div className="flex gap-2">
                  <Input
                    value={formData.client_secret}
                    onChange={(e) =>
                      setFormData({ ...formData, client_secret: e.target.value })
                    }
                    placeholder={MASKED_SECRET}
                  />
                  <Button type="button" variant="ghost" size="sm" onClick={copySecret}>
                    Copy
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Existing secret is not returned by Hydra. Keep {MASKED_SECRET} to leave it unchanged.
                </p>
                {copyMessage && (
                  <p className="text-xs text-muted-foreground">{copyMessage}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setEditing(false);
                    setCopyMessage("");
                    setError("");
                    fetchClient();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 text-sm">
              <DetailRow label="Client ID" value={client?.client_id} mono />
              <DetailRow label="Client Name" value={client?.client_name} />
              <DetailRow
                label="Token Auth Method"
                value={client?.token_endpoint_auth_method}
                mono
              />
              <DetailRow label="Scope" value={client?.scope} mono />
              <DetailRow
                label="Grant Types"
                value={(client?.grant_types || []).join(", ")}
                mono
              />
              <DetailRow
                label="Response Types"
                value={(client?.response_types || []).join(", ")}
                mono
              />
              <DetailRow
                label="Skip Consent"
                value={client?.skip_consent ? "true" : "false"}
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4">
                <p className="font-medium">Client Secret</p>
                <div className="md:col-span-2 flex items-center gap-2">
                  <p className="font-mono text-xs">{MASKED_SECRET}</p>
                  <Button type="button" variant="ghost" size="sm" onClick={copySecret}>
                    Copy
                  </Button>
                </div>
              </div>
              {copyMessage && (
                <p className="text-xs text-muted-foreground md:ml-[34%]">{copyMessage}</p>
              )}
              <DetailRow
                label="Secret Expires At"
                value={
                  client?.client_secret_expires_at
                    ? new Date(client.client_secret_expires_at * 1000).toISOString()
                    : "never"
                }
                mono
              />
              <DetailRow label="Created At" value={client?.created_at} mono />
              <DetailRow label="Updated At" value={client?.updated_at} mono />

              <div className="space-y-2">
                <p className="font-medium">Redirect URIs</p>
                {(client?.redirect_uris || []).length === 0 ? (
                  <p className="text-muted-foreground">-</p>
                ) : (
                  <ul className="space-y-1">
                    {(client?.redirect_uris || []).map((uri) => (
                      <li
                        key={uri}
                        className="rounded border bg-muted/30 px-2 py-1 font-mono text-xs break-all"
                      >
                        {uri}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value?: string;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4">
      <p className="font-medium">{label}</p>
      <p className={`md:col-span-2 ${mono ? "font-mono text-xs break-all" : ""}`}>
        {value || "-"}
      </p>
    </div>
  );
}
