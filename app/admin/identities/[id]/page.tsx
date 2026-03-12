"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
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

interface AccessInfo {
  globalRoles: { role: string; object: string }[];
  orgRoles: { organizationId: string; role: string }[];
  groupMemberships: { groupId: string; role: string }[];
  gitlabAccess: { resourceType: string; resourceId: string; role: string }[];
}

export default function IdentityDetailPage() {
  const router = useRouter();
  const params = useParams();
  // Handle params.id being string or string[] or undefined
  const id =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
        ? params.id[0]
        : undefined;

  const [identity, setIdentity] = useState<Identity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
  });
  const [accessInfo, setAccessInfo] = useState<AccessInfo | null>(null);
  const [accessLoading, setAccessLoading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchIdentity();
      fetchAccess();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchIdentity = async () => {
    if (!id) {
      setError("Invalid identity ID");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/admin/identities/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch identity");
      }
      const result = await response.json();
      // API wraps response in { data, status }
      const data = result.data || result;
      setIdentity(data);
      setFormData({
        email: data.traits?.email || "",
        firstName: data.traits?.name?.first || "",
        lastName: data.traits?.name?.last || "",
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchAccess = async () => {
    if (!id) return;
    try {
      setAccessLoading(true);
      const response = await fetch(`/api/admin/identities/${id}/access`);
      if (response.ok) {
        const result = await response.json();
        setAccessInfo(result.data || result);
      }
    } catch {
      // Non-critical: silently fail, access card will show empty state
    } finally {
      setAccessLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!id) {
      setError("Invalid identity ID");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/identities/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          schema_id: identity?.schema_id || "default",
          state: identity?.state || "active",
          traits: {
            email: formData.email,
            name: {
              first: formData.firstName,
              last: formData.lastName,
            },
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update identity");
      }

      const result = await response.json();
      // API wraps response in { data, status }
      const updated = result.data || result;
      setIdentity(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) {
      alert("Invalid identity ID");
      return;
    }

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

      router.push("/admin/identities");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete identity");
    }
  };

  // Handle invalid ID
  if (!id) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200">Invalid identity ID</p>
        <Link
          href="/admin/identities"
          className="mt-2 inline-block text-sm text-red-600 dark:text-red-400 hover:underline"
        >
          Back to identities
        </Link>
      </div>
    );
  }

  if (loading && !identity) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-zinc-200 dark:border-zinc-700 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-600 dark:text-zinc-400">
            Loading identity...
          </p>
        </div>
      </div>
    );
  }

  if (error && !identity) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200">{error}</p>
        <Link
          href="/admin/identities"
          className="mt-2 inline-block text-sm text-red-600 dark:text-red-400 hover:underline"
        >
          Back to identities
        </Link>
      </div>
    );
  }

  if (!identity) {
    return null;
  }

  return (
    <div className="max-w-3xl p-6 md:p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            Identity Details
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400">
            {identity.traits.email}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!editing && (
            <>
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 border border-red-600 text-red-600 dark:border-red-400 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {editing ? (
        <form onSubmit={handleUpdate} className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              Edit Identity
            </h3>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-zinc-900 dark:text-zinc-50 mb-2"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="firstName"
                    className="block text-sm font-medium text-zinc-900 dark:text-zinc-50 mb-2"
                  >
                    First Name
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="lastName"
                    className="block text-sm font-medium text-zinc-900 dark:text-zinc-50 mb-2"
                  >
                    Last Name
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setFormData({
                  email: identity.traits.email || "",
                  firstName: identity.traits.name?.first || "",
                  lastName: identity.traits.name?.last || "",
                });
              }}
              className="px-6 py-2 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              Profile Information
            </h3>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Email
                </dt>
                <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                  {identity.traits.email || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Name
                </dt>
                <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                  {identity.traits.name?.first || identity.traits.name?.last
                    ? `${identity.traits.name?.first || ""} ${
                        identity.traits.name?.last || ""
                      }`.trim()
                    : "—"}
                </dd>
              </div>
            </dl>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              System Information
            </h3>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Identity ID
                </dt>
                <dd className="mt-1 text-sm font-mono text-zinc-900 dark:text-zinc-50">
                  {identity.id}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Schema ID
                </dt>
                <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                  {identity.schema_id}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  State
                </dt>
                <dd className="mt-1">
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                    {identity.state}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Created At
                </dt>
                <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                  {new Date(identity.created_at).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Updated At
                </dt>
                <dd className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">
                  {new Date(identity.updated_at).toLocaleString()}
                </dd>
              </div>
            </dl>
          </div>

          {/* Access & Permissions Card */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              Access &amp; Permissions
            </h3>
            {accessLoading ? (
              <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                <div className="w-4 h-4 border-2 border-zinc-300 dark:border-zinc-600 border-t-zinc-600 dark:border-t-zinc-300 rounded-full animate-spin" />
                Loading access info...
              </div>
            ) : (
              <dl className="space-y-5">
                {/* Global Roles */}
                <div>
                  <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                    Global Roles
                  </dt>
                  <dd>
                    {accessInfo?.globalRoles &&
                    accessInfo.globalRoles.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {accessInfo.globalRoles.map((r, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400"
                          >
                            {r.role}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-zinc-400 dark:text-zinc-500">
                        None
                      </span>
                    )}
                  </dd>
                </div>

                {/* Organization Roles */}
                <div>
                  <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                    Organization Roles
                  </dt>
                  <dd>
                    {accessInfo?.orgRoles && accessInfo.orgRoles.length > 0 ? (
                      <div className="space-y-1">
                        {accessInfo.orgRoles.map((r, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                              {r.role}
                            </span>
                            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono truncate">
                              {r.organizationId}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-zinc-400 dark:text-zinc-500">
                        None
                      </span>
                    )}
                  </dd>
                </div>

                {/* Group Memberships */}
                <div>
                  <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                    Group Memberships
                  </dt>
                  <dd>
                    {accessInfo?.groupMemberships &&
                    accessInfo.groupMemberships.length > 0 ? (
                      <div className="space-y-1">
                        {accessInfo.groupMemberships.map((g, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                              {g.role}
                            </span>
                            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono truncate">
                              {g.groupId}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-zinc-400 dark:text-zinc-500">
                        None
                      </span>
                    )}
                  </dd>
                </div>

                {/* GitLab Access */}
                <div>
                  <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                    GitLab Access
                  </dt>
                  <dd>
                    {accessInfo?.gitlabAccess &&
                    accessInfo.gitlabAccess.length > 0 ? (
                      <div className="space-y-1">
                        {accessInfo.gitlabAccess.map((g, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 flex-wrap"
                          >
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
                              {g.role}
                            </span>
                            <span className="text-xs text-zinc-500 dark:text-zinc-400">
                              {g.resourceType}:
                            </span>
                            <span className="text-xs text-zinc-700 dark:text-zinc-300 font-mono truncate">
                              {g.resourceId}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-zinc-400 dark:text-zinc-500">
                        None
                      </span>
                    )}
                  </dd>
                </div>
              </dl>
            )}
          </div>
        </div>
      )}

      <div className="mt-6">
        <Link
          href="/admin/identities"
          className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
        >
          ← Back to all identities
        </Link>
      </div>
    </div>
  );
}
