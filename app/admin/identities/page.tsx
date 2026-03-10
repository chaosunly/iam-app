"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, AlertCircle } from "lucide-react";

interface Identity {
  id: string;
  schema_id: string;
  traits: {
    email?: string;
    name?: {
      first?: string;
      last?: string;
    };
  };
  state: string;
  created_at: string;
  updated_at: string;
}

export default function IdentitiesPage() {
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchIdentities();
  }, []);

  const fetchIdentities = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/identities");
      if (!response.ok) {
        throw new Error("Failed to fetch identities");
      }
      const result = await response.json();

      // Validate response structure
      if (!result || typeof result !== "object") {
        console.error("Invalid API response:", result);
        throw new Error("Invalid response from server");
      }

      // Ensure data is an array
      const identitiesData = result.data;
      if (!Array.isArray(identitiesData)) {
        console.error("API returned non-array data:", identitiesData);
        setIdentities([]);
      } else {
        setIdentities(identitiesData);
      }

      setError(null);
    } catch (err) {
      console.error("Error fetching identities:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
      setIdentities([]); // Ensure we always have an array
    } finally {
      setLoading(false);
    }
  };

  const deleteIdentity = async (id: string) => {
    if (!confirm("Are you sure you want to delete this identity?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/identities/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete identity");
      }

      // Refresh the list
      fetchIdentities();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete identity");
    }
  };

  const filteredIdentities = identities.filter((identity) => {
    const email = identity.traits.email?.toLowerCase() || "";
    const name = `${identity.traits.name?.first || ""} ${
      identity.traits.name?.last || ""
    }`.toLowerCase();
    const search = searchTerm.toLowerCase();
    return (
      email.includes(search) ||
      name.includes(search) ||
      identity.id.includes(search)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-muted border-t-foreground rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading identities...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button variant="link" onClick={fetchIdentities} className="mt-2 px-0">
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2">Identities</h2>
          <p className="text-muted-foreground">Manage all user identities</p>
        </div>
        <Button asChild>
          <Link href="/admin/identities/new">
            <Plus className="w-4 h-4 mr-2" />
            Create Identity
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <Input
          type="text"
          placeholder="Search by email, name, or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIdentities.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-12"
                  >
                    {searchTerm
                      ? "No identities found matching your search"
                      : "No identities found"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredIdentities.map((identity) => (
                  <TableRow key={identity.id}>
                    <TableCell>
                      <div className="font-medium">
                        {identity.traits.email || "No email"}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {identity.id.substring(0, 8)}...
                      </div>
                    </TableCell>
                    <TableCell>
                      {identity.traits.name?.first || identity.traits.name?.last
                        ? `${identity.traits.name?.first || ""} ${
                            identity.traits.name?.last || ""
                          }`.trim()
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{identity.state}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(identity.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/admin/identities/${identity.id}`}>
                            View
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteIdentity(identity.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 text-sm text-muted-foreground">
        Showing {filteredIdentities.length} of {identities.length} identities
      </div>
    </div>
  );
}
