"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

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
  const router = useRouter();
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
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-600 dark:text-zinc-400">Loading spaces...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">Matrix Spaces</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            Manage Matrix spaces (collections of rooms) within an org
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
        >
          Create Space
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Filter by org */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Filter by org:</label>
        <select
          value={orgFilter}
          onChange={(e) => setOrgFilter(e.target.value)}
          className="px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All orgs</option>
          {orgs.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>

      {/* Create Space inline panel */}
      {showCreate && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">New Space</h2>
          {createError && (
            <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-800 dark:text-red-200 text-sm">
              {createError}
            </div>
          )}
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-50 mb-1">
                Org <span className="text-red-500">*</span>
              </label>
              <select
                value={newOrgId}
                onChange={(e) => setNewOrgId(e.target.value)}
                required
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select org</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-50 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                placeholder="engineering"
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-50 mb-1">
                Element Space ID
              </label>
              <input
                type="text"
                value={newMatrixId}
                onChange={(e) => setNewMatrixId(e.target.value)}
                placeholder="!abc123:matrix.org"
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-50 mb-1">
                Description
              </label>
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={creating}
                className="px-5 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors text-sm"
              >
                {creating ? "Creating..." : "Create Space"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-5 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        {spaces.length > 0 ? (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {spaces.map((space) => (
              <div
                key={space.id}
                className="p-6 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                      {space.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {space.org && (
                        <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                          {space.org.name}
                        </span>
                      )}
                      {space.matrixId && (
                        <span className="text-xs text-zinc-500 font-mono">{space.matrixId}</span>
                      )}
                    </div>
                    {space.description && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                        {space.description}
                      </p>
                    )}
                    <p className="text-xs text-zinc-500 mt-1">
                      Created {new Date(space.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Link
                      href={`/admin/matrix/rooms?spaceId=${space.id}`}
                      className="px-3 py-1.5 text-sm text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded transition-colors"
                    >
                      Rooms
                    </Link>
                    <Link
                      href={`/admin/matrix/roles?resourceType=space&resourceId=${space.id}`}
                      className="px-3 py-1.5 text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded transition-colors"
                    >
                      Roles
                    </Link>
                    <button
                      onClick={() => handleDelete(space.id, space.name)}
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
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">No spaces yet</h3>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400 text-sm">
              {orgFilter
                ? "No spaces found for the selected org."
                : "Create a space to organise Matrix rooms."}
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-6 inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            >
              Create Space
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
