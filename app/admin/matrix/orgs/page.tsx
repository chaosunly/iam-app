"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { AlertCircle, Building2 } from "lucide-react";

interface MatrixOrg {
  id: string;
  name: string;
  description?: string | null;
  homeserver?: string | null;
  createdAt: string;
}

export default function MatrixOrgsPage() {
  const [orgs, setOrgs] = useState<MatrixOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchOrgs();
  }, []);

  async function fetchOrgs() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/matrix/orgs");
      if (res.status === 403) {
        setError("You do not have permission to view Matrix orgs.");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch orgs");
      const data = await res.json();
      setOrgs(data.orgs || []);
    } catch (err: any) {
      setError(err.message || "Failed to load orgs");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(orgId: string, orgName: string) {
    if (!confirm(`Delete Matrix org "${orgName}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/admin/matrix/orgs/${orgId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete org");
      }
      fetchOrgs();
    } catch (err: any) {
      alert(err.message || "Failed to delete org");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading orgs...
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Matrix Orgs</h1>
          <p className="text-muted-foreground mt-1">Manage Matrix homeserver organisations</p>
        </div>
        <Button asChild>
          <Link href="/admin/matrix/orgs/new">Create Org</Link>
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="p-0 gap-0">
        {orgs.length > 0 ? (
          <div className="divide-y">
            {orgs.map((org) => (
              <div
                key={org.id}
                className="p-6 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-lg font-semibold">{org.name}</p>
                    {org.homeserver && (
                      <p className="text-sm text-muted-foreground mt-0.5 font-mono">
                        {org.homeserver}
                      </p>
                    )}
                    {org.description && (
                      <p className="text-muted-foreground mt-1 text-sm">{org.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Created {new Date(org.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/admin/matrix/spaces?orgId=${org.id}`}>Spaces</Link>
                    </Button>
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/admin/matrix/roles?resourceType=org&resourceId=${org.id}`}>
                        Roles
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(org.id, org.name)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No orgs yet</h3>
            <p className="mt-2 text-muted-foreground text-sm">
              Create a Matrix org to start managing spaces and roles.
            </p>
            <Button asChild className="mt-6">
              <Link href="/admin/matrix/orgs/new">Create Org</Link>
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
