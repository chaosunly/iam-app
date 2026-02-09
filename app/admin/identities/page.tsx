"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
      const data = await response.json();
      setIdentities(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
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
          <div className="w-12 h-12 border-4 border-zinc-200 dark:border-zinc-700 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-600 dark:text-zinc-400">
            Loading identities...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200">{error}</p>
        <button
          onClick={fetchIdentities}
          className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            Identities
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400">
            Manage all user identities
          </p>
        </div>
        <Link
          href="/admin/identities/new"
          className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors flex items-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          Create Identity
        </Link>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by email, name, or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Created
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
                    colSpan={5}
                    className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400"
                  >
                    {searchTerm
                      ? "No identities found matching your search"
                      : "No identities found"}
                  </td>
                </tr>
              ) : (
                filteredIdentities.map((identity) => (
                  <tr
                    key={identity.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {identity.traits.email || "No email"}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                        {identity.id.substring(0, 8)}...
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-zinc-900 dark:text-zinc-50">
                        {identity.traits.name?.first ||
                        identity.traits.name?.last
                          ? `${identity.traits.name?.first || ""} ${
                              identity.traits.name?.last || ""
                            }`.trim()
                          : "—"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                        {identity.state}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500 dark:text-zinc-400">
                      {new Date(identity.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/identities/${identity.id}`}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => deleteIdentity(identity.id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
        Showing {filteredIdentities.length} of {identities.length} identities
      </div>
    </div>
  );
}
