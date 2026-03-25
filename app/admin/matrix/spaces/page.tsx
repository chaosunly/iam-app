"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Layers } from "lucide-react";

interface MatrixOrg {
  id: string;
  name: string;
}

interface MatrixSpace {
  id: string;
  name: string;
  description?: string | null;
  matrixId?: string | null;
  orgId: string;
  createdAt: string;
  org?: MatrixOrg | null;
}

export default function MatrixSpacesPage() {
  const searchParams = useSearchParams();
  const [orgFilter, setOrgFilter] = useState(searchParams.get("orgId") || "");
  const [orgs, setOrgs] = useState<MatrixOrg[]>([]);
  const [spaces, setSpaces] = useState<MatrixSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newMatrixId, setNewMatrixId] = useState("");
  const [newOrgId, setNewOrgId] = useState(searchParams.get("orgId") || "");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    fetchOrgs();
  }, []);

  useEffect(() => {
    fetchSpaces();
  }, [orgFilter]);

  async function fetchOrgs() {
    try {
      const res = await fetch("/api/admin/matrix/orgs");
      if (res.ok) {
        const data = await res.json();
        setOrgs(data.orgs || []);
      }
    } catch {
      // non-blocking
    }
  }

  async function fetchSpaces() {
    try {
      setLoading(true);
      const url = orgFilter
        ? `/api/admin/matrix/spaces?orgId=${orgFilter}`
        : "/api/admin/matrix/spaces";
      const res = await fetch(url);
      if (res.status === 403) {
        setError("You do not have permission to view Matrix spaces.");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch spaces");
      const data = await res.json();
      setSpaces(data.spaces || []);
    } catch (err: any) {
      setError(err.message || "Failed to load spaces");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    setCreating(true);

    try {
      const res = await fetch("/api/admin/matrix/spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription.trim() || undefined,
          matrixId: newMatrixId.trim() || undefined,
          orgId: newOrgId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create space");
      }

      setShowCreate(false);
      setNewName("");
      setNewDescription("");
      setNewMatrixId("");
      fetchSpaces();
    } catch (err: any) {
      setCreateError(err.message || "Failed to create space");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(spaceId: string, spaceName: string) {
    if (!confirm(`Delete space "${spaceName}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/admin/matrix/spaces/${spaceId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete space");
      }
      fetchSpaces();
    } catch (err: any) {
      alert(err.message || "Failed to delete space");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading spaces...
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Matrix Spaces</h1>
          <p className="text-muted-foreground mt-1">
            Manage Matrix spaces (collections of rooms) within an org
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>Create Space</Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filter by org */}
      <div className="flex items-center gap-3">
        <Label>Filter by org:</Label>
        <Select
          value={orgFilter || "__all__"}
          onValueChange={(v) => setOrgFilter(v === "__all__" ? "" : v)}
        >
          <SelectTrigger className="w-50">
            <SelectValue placeholder="All orgs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All orgs</SelectItem>
            {orgs.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Create Space inline panel */}
      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle>New Space</CardTitle>
          </CardHeader>
          <CardContent>
            {createError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{createError}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>
                  Org <span className="text-destructive">*</span>
                </Label>
                <Select value={newOrgId} onValueChange={setNewOrgId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select org" />
                  </SelectTrigger>
                  <SelectContent>
                    {orgs.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  placeholder="engineering"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Element Space ID</Label>
                <Input
                  value={newMatrixId}
                  onChange={(e) => setNewMatrixId(e.target.value)}
                  placeholder="!abc123:matrix.org"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="col-span-2 flex gap-3">
                <Button type="submit" disabled={creating}>
                  {creating ? "Creating..." : "Create Space"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="p-0 gap-0">
        {spaces.length > 0 ? (
          <div className="divide-y">
            {spaces.map((space) => (
              <div key={space.id} className="p-6 hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-base font-semibold">{space.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {space.org && (
                        <Badge variant="secondary">{space.org.name}</Badge>
                      )}
                      {space.matrixId && (
                        <span className="text-xs text-muted-foreground font-mono">
                          {space.matrixId}
                        </span>
                      )}
                    </div>
                    {space.description && (
                      <p className="text-sm text-muted-foreground mt-1">{space.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Created {new Date(space.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/admin/matrix/rooms?spaceId=${space.id}`}>Rooms</Link>
                    </Button>
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/admin/matrix/roles?resourceType=space&resourceId=${space.id}`}>
                        Roles
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(space.id, space.name)}
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
            <Layers className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No spaces yet</h3>
            <p className="mt-2 text-muted-foreground text-sm">
              {orgFilter
                ? "No spaces found for the selected org."
                : "Create a space to organise Matrix rooms."}
            </p>
            <Button className="mt-6" onClick={() => setShowCreate(true)}>
              Create Space
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
