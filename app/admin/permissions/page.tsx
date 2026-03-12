"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, Users, Folder, Shield } from "lucide-react";
interface Identity {
  id: string;
  traits: {
    email?: string;
  };
}

interface Permission {
  namespace: string;
  object: string;
  relation: string;
  subject: string;
}

export default function PermissionsPage() {
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [identitiesRes, permissionsRes] = await Promise.all([
        fetch("/api/admin/identities"),
        fetch("/api/admin/permissions"),
      ]);

      if (identitiesRes.ok) {
        const identitiesResult = await identitiesRes.json();
        // API wraps response in { data, status }
        setIdentities(
          Array.isArray(identitiesResult.data) ? identitiesResult.data : [],
        );
      }

      if (permissionsRes.ok) {
        const permissionsResult = await permissionsRes.json();
        // API wraps response in { data, status }
        setPermissions(
          Array.isArray(permissionsResult.data?.permissions)
            ? permissionsResult.data.permissions
            : [],
        );
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const hasAdminAccess = (userId: string) => {
    return permissions.some(
      (p) =>
        p.subject === userId &&
        p.namespace === "GlobalRole" &&
        p.object === "admin" &&
        p.relation === "members",
    );
  };

  const revokeAccess = async (userId: string) => {
    if (!confirm("Are you sure you want to revoke admin access?")) {
      return;
    }

    try {
      setActionLoading(userId);
      const response = await fetch(`/api/admin/permissions?userId=${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to revoke access");
      }

      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to revoke access");
    } finally {
      setActionLoading(null);
    }
  };

  const filteredIdentities = identities.filter((identity) => {
    const email = identity.traits.email?.toLowerCase() || "";
    const search = searchTerm.toLowerCase();
    return email.includes(search) || identity.id.includes(search);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-muted border-t-foreground rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Permission Management</h2>
        <p className="text-muted-foreground">
          Manage access permissions across all services
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* GitLab Access Section */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-1">GitLab Access</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Manage GitLab-style groups, projects, and role assignments
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/admin/gitlab/groups">
            <Card className="hover:border-blue-500 transition-colors cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Groups</h4>
                    <p className="text-xs text-muted-foreground">
                      Manage GitLab groups
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/gitlab/projects">
            <Card className="hover:border-green-500 transition-colors cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Folder className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Projects</h4>
                    <p className="text-xs text-muted-foreground">
                      Manage GitLab projects
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/gitlab/roles">
            <Card className="hover:border-purple-500 transition-colors cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Role Assignments</h4>
                    <p className="text-xs text-muted-foreground">
                      Assign and manage roles
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Ory Keto Permissions */}
      <h3 className="text-xl font-semibold mb-4">Ory Keto — Admin Access</h3>

      {/* Search */}
      <div className="mb-6">
        <Input
          type="text"
          placeholder="Search by email or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-1">Total Users</p>
            <p className="text-3xl font-bold">{identities.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-1">Admins</p>
            <p className="text-3xl font-bold">{permissions.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Admin Access</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIdentities.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground py-12"
                  >
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                filteredIdentities.map((identity) => {
                  const isAdmin = hasAdminAccess(identity.id);
                  const isLoading = actionLoading === identity.id;

                  return (
                    <TableRow key={identity.id}>
                      <TableCell className="font-medium">
                        {identity.traits.email || "No email"}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-mono text-muted-foreground">
                          {identity.id.substring(0, 16)}...
                        </span>
                      </TableCell>
                      <TableCell>
                        {isAdmin ? (
                          <Badge>Admin</Badge>
                        ) : (
                          <Badge variant="secondary">User</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => revokeAccess(identity.id)}
                            disabled={isLoading}
                          >
                            {isLoading ? "Revoking..." : "Revoke"}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
