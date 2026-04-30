"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface Identity {
  id: string;
  schema_id: string;
  traits: {
    email?: string;
    name?: { first?: string; last?: string };
  };
  state: string;
  created_at: string;
  updated_at: string;
}

interface AccessInfo {
  globalRoles: { role: string; object: string }[];
  orgRoles: { organizationId: string; role: string }[];
  groupMemberships: { groupId: string; role: string }[];
  gitlabAccess: { resourceType: string; resourceId: string; role: string }[];
}

interface Props {
  identity: Identity;
  accessInfo: AccessInfo;
}

export function IdentityDetail({ identity: initialIdentity, accessInfo }: Props) {
  const router = useRouter();
  const [identity, setIdentity] = useState(initialIdentity);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: initialIdentity.traits.email || "",
    firstName: initialIdentity.traits.name?.first || "",
    lastName: initialIdentity.traits.name?.last || "",
  });

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/identities/${identity.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schema_id: identity.schema_id,
          state: identity.state,
          traits: {
            email: formData.email,
            name: { first: formData.firstName, last: formData.lastName },
          },
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to update identity");
      }
      const saved = result.data || result;
      setIdentity(saved);
      setFormData({
        email: saved.traits.email || "",
        firstName: saved.traits.name?.first || "",
        lastName: saved.traits.name?.last || "",
      });
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this identity? This action cannot be undone.")) return;
    try {
      const response = await fetch(`/api/admin/identities/${identity.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete identity");
      router.push("/admin/identities");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete identity");
    }
  };

  return (
    <div className="max-w-3xl p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2">Identity Details</h2>
          <p className="text-muted-foreground">{identity.traits.email}</p>
        </div>
        {!editing && (
          <div className="flex items-center gap-2">
            <Button onClick={() => setEditing(true)}>Edit</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </div>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {editing ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit Identity</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditing(false);
                    setFormData({
                      email: identity.traits.email || "",
                      firstName: identity.traits.name?.first || "",
                      lastName: identity.traits.name?.last || "",
                    });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Email</dt>
                <dd className="mt-1 text-sm">{identity.traits.email || "—"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Name</dt>
                <dd className="mt-1 text-sm">
                  {identity.traits.name?.first || identity.traits.name?.last
                    ? `${identity.traits.name?.first || ""} ${identity.traits.name?.last || ""}`.trim()
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Identity ID</dt>
                <dd className="mt-1 text-sm font-mono">{identity.id}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Schema ID</dt>
                <dd className="mt-1 text-sm">{identity.schema_id}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">State</dt>
                <dd className="mt-1">
                  <Badge variant="secondary">{identity.state}</Badge>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Created</dt>
                <dd className="mt-1 text-sm">{new Date(identity.created_at).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Updated</dt>
                <dd className="mt-1 text-sm">{new Date(identity.updated_at).toLocaleString()}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Access &amp; Permissions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Global Roles</p>
            {accessInfo.globalRoles.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {accessInfo.globalRoles.map((r) => (
                  <Badge key={r.object} className="bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400">
                    {r.role}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">None</p>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Organization Roles</p>
            {accessInfo.orgRoles.length > 0 ? (
              <div className="space-y-1">
                {accessInfo.orgRoles.map((r) => (
                  <div key={r.organizationId} className="flex items-center gap-2">
                    <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">{r.role}</Badge>
                    <span className="text-xs text-muted-foreground font-mono">{r.organizationId}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">None</p>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Group Memberships</p>
            {accessInfo.groupMemberships.length > 0 ? (
              <div className="space-y-1">
                {accessInfo.groupMemberships.map((g) => (
                  <div key={g.groupId} className="flex items-center gap-2">
                    <Badge variant="secondary">{g.role}</Badge>
                    <span className="text-xs text-muted-foreground font-mono">{g.groupId}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">None</p>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">GitLab Access</p>
            {accessInfo.gitlabAccess.length > 0 ? (
              <div className="space-y-1">
                {accessInfo.gitlabAccess.map((g) => (
                  <div key={`${g.resourceType}-${g.resourceId}`} className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
                      {g.role}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{g.resourceType}:</span>
                    <span className="text-xs font-mono">{g.resourceId}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">None</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Link href="/admin/identities" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to all identities
      </Link>
    </div>
  );
}
