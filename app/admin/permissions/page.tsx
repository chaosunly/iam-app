"use client";

import { useEffect, useState } from "react";

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

  const grantAccess = async (userId: string) => {
    try {
      setActionLoading(userId);
      const response = await fetch("/api/admin/permissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to grant access");
      }

      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to grant access");
    } finally {
      setActionLoading(null);
    }
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
          <div className="w-12 h-12 border-4 border-zinc-200 dark:border-zinc-700 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-600 dark:text-zinc-400">
            Loading permissions...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          Permission Management
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          Manage admin access using Ory Keto
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by email or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
            Total Users
          </p>
          <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            {identities.length}
          </p>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
            Admins
          </p>
          <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            {permissions.length}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  User ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Admin Access
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {filteredIdentities.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400"
                  >
                    No users found
                  </td>
                </tr>
              ) : (
                filteredIdentities.map((identity) => {
                  const isAdmin = hasAdminAccess(identity.id);
                  const isLoading = actionLoading === identity.id;

                  return (
                    <tr
                      key={identity.id}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          {identity.traits.email || "No email"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                          {identity.id.substring(0, 16)}...
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isAdmin ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                            Admin
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-400">
                            User
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {isAdmin ? (
                          <button
                            onClick={() => revokeAccess(identity.id)}
                            disabled={isLoading}
                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 disabled:opacity-50"
                          >
                            {isLoading ? "Revoking..." : "Revoke"}
                          </button>
                        ) : (
                          <button
                            onClick={() => grantAccess(identity.id)}
                            disabled={isLoading}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 disabled:opacity-50"
                          >
                            {isLoading ? "Granting..." : "Grant Admin"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
