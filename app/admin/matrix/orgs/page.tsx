"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-600 dark:text-zinc-400">Loading orgs...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">Matrix Orgs</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            Manage Matrix homeserver organisations
          </p>
        </div>
        <Link
          href="/admin/matrix/orgs/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Create Org
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        {orgs.length > 0 ? (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {orgs.map((org) => (
              <div
                key={org.id}
                className="p-6 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                      {org.name}
                    </p>
                    {org.homeserver && (
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 font-mono">
                        {org.homeserver}
                      </p>
                    )}
                    {org.description && (
                      <p className="text-zinc-600 dark:text-zinc-400 mt-1 text-sm">
                        {org.description}
                      </p>
                    )}
                    <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-2">
                      Created {new Date(org.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Link
                      href={`/admin/matrix/spaces?orgId=${org.id}`}
                      className="px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                    >
                      Spaces
                    </Link>
                    <Link
                      href={`/admin/matrix/roles?resourceType=org&resourceId=${org.id}`}
                      className="px-3 py-1.5 text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded transition-colors"
                    >
                      Roles
                    </Link>
                    <button
                      onClick={() => handleDelete(org.id, org.name)}
                      className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="mx-auto h-12 w-12 text-zinc-400 mb-4">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">No orgs yet</h3>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400 text-sm">
              Create a Matrix org to start managing spaces and roles.
            </p>
            <Link
              href="/admin/matrix/orgs/new"
              className="mt-6 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Create Org
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
