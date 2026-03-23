"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

// ─── Types ──────────────────────────────────────────────────────────────────

type MatrixResourceType = "org" | "space" | "room";

interface Identity {
  id: string;
  traits: { email?: string; name?: string };
}

interface MatrixOrg   { id: string; name: string }
interface MatrixSpace { id: string; name: string; orgId: string; org?: MatrixOrg | null }
interface MatrixRoom  { id: string; name: string; spaceId: string; space?: MatrixSpace | null }

interface MatrixRoleAssignment {
  id: string;
  userId: string;
  resourceType: MatrixResourceType;
  resourceId: string;
  role: string;
  createdAt: string;
}

interface SyncResult {
  synced: boolean;
  skipped: boolean;
  error?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const MATRIX_ROLES = ["matrix_admin", "moderator", "support", "member", "viewer"] as const;

const ROLE_LABELS: Record<string, string> = {
  matrix_admin: "Matrix Admin",
  moderator:    "Moderator",
  support:      "Support",
  member:       "Member",
  viewer:       "Viewer",
};

const ROLE_COLORS: Record<string, string> = {
  matrix_admin: "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200",
  moderator:    "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200",
  support:      "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200",
  member:       "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200",
  viewer:       "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300",
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function MatrixRolesPage() {
  const searchParams = useSearchParams();

  // Form state
  const [resourceType, setResourceType] = useState<MatrixResourceType>(
    (searchParams.get("resourceType") as MatrixResourceType) || "org",
  );
  const [resourceId, setResourceId] = useState(searchParams.get("resourceId") || "");
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<string>("member");
  const [roleFilter, setRoleFilter] = useState("");
  const [userSearch, setUserSearch] = useState("");

  // Data
  const [orgs, setOrgs] = useState<MatrixOrg[]>([]);
  const [spaces, setSpaces] = useState<MatrixSpace[]>([]);
  const [rooms, setRooms] = useState<MatrixRoom[]>([]);
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [members, setMembers] = useState<MatrixRoleAssignment[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [syncStatus, setSyncStatus] = useState<SyncResult | null>(null);

  // ── Initial data load ────────────────────────────────────────────────────

  useEffect(() => {
    fetchOrgs();
    fetchIdentities();
  }, []);

  useEffect(() => {
    if (resourceType === "space" || resourceType === "room") {
      fetchSpaces();
    }
    if (resourceType === "room") {
      fetchRooms();
    }
    setResourceId("");
  }, [resourceType]);

  useEffect(() => {
    if (resourceId) fetchMembers();
    else setMembers([]);
  }, [resourceType, resourceId]);

  // ── Fetchers ─────────────────────────────────────────────────────────────

  async function fetchOrgs() {
    try {
      const res = await fetch("/api/admin/matrix/orgs");
      if (res.ok) {
        const data = await res.json();
        setOrgs(data.orgs || []);
      }
    } catch { /* non-blocking */ }
  }

  async function fetchSpaces() {
    try {
      const res = await fetch("/api/admin/matrix/spaces");
      if (res.ok) {
        const data = await res.json();
        setSpaces(data.spaces || []);
      }
    } catch { /* non-blocking */ }
  }

  async function fetchRooms() {
    try {
      const res = await fetch("/api/admin/matrix/rooms");
      if (res.ok) {
        const data = await res.json();
        setRooms(data.rooms || []);
      }
    } catch { /* non-blocking */ }
  }

  async function fetchIdentities() {
    try {
      const res = await fetch("/api/admin/identities?per_page=250");
      if (res.ok) {
        const json = await res.json();
        setIdentities(json.data || []);
      }
    } catch { /* non-blocking */ }
  }

  async function fetchMembers() {
    if (!resourceId) return;
    try {
      setMembersLoading(true);
      const res = await fetch(
        `/api/admin/matrix/roles?resourceType=${resourceType}&resourceId=${resourceId}`,
      );
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      }
    } catch { /* non-blocking */ }
    finally { setMembersLoading(false); }
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  async function handleAssignRole(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSyncStatus(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/matrix/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, resourceType, resourceId, role }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to assign role");
      }

      const data = await res.json();
      setSyncStatus(data.sync ?? null);
      setSuccess(`Role "${ROLE_LABELS[role]}" assigned successfully.`);
      setUserId("");
      fetchMembers();
    } catch (err: any) {
      setError(err.message || "Failed to assign role");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveRole(assignment: MatrixRoleAssignment) {
    if (
      !confirm(
        `Remove ${ROLE_LABELS[assignment.role] ?? assignment.role} role from user ${assignment.userId}?`,
      )
    ) return;

    try {
      const res = await fetch("/api/admin/matrix/roles", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: assignment.userId,
          resourceType: assignment.resourceType,
          resourceId: assignment.resourceId,
          role: assignment.role,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove role");
      }

      fetchMembers();
    } catch (err: any) {
      alert(err.message || "Failed to remove role");
    }
  }

  // ── Derived data ─────────────────────────────────────────────────────────

  const resourceOptions: { id: string; label: string }[] = resourceType === "org"
    ? orgs.map((o) => ({ id: o.id, label: o.name }))
    : resourceType === "space"
    ? spaces.map((s) => ({ id: s.id, label: s.org ? `${s.org.name} / ${s.name}` : s.name }))
    : rooms.map((r) => ({
        id: r.id,
        label: r.space
          ? `${r.space.org?.name ? r.space.org.name + " / " : ""}${r.space.name} / #${r.name}`
          : `#${r.name}`,
      }));

  const filteredIdentities = userSearch
    ? identities.filter(
        (i) =>
          i.traits?.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
          i.traits?.name?.toLowerCase().includes(userSearch.toLowerCase()),
      )
    : identities;

  const filteredMembers = roleFilter
    ? members.filter((m) => m.role === roleFilter)
    : members;

  function identityLabel(id: string): string {
    const identity = identities.find((i) => i.id === id);
    return identity?.traits?.email || identity?.traits?.name || id;
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6 md:p-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          Matrix Role Assignments
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">
          Assign and manage Matrix roles for users across orgs, spaces, and rooms
        </p>
      </div>

      {/* Assign Role Form */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">Assign Role</h2>

        {/* Feedback messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-800 dark:text-green-200 text-sm">
            {success}
            {/* Sync status badge */}
            {syncStatus && (
              <span className="ml-3 inline-flex items-center gap-1 text-xs">
                {syncStatus.skipped ? (
                  <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded-full">
                    Matrix sync disabled
                  </span>
                ) : syncStatus.synced ? (
                  <span className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">
                    ✓ Synced to Matrix
                  </span>
                ) : (
                  <span
                    className="bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 px-2 py-0.5 rounded-full"
                    title={syncStatus.error}
                  >
                    ⚠ Sync failed — {syncStatus.error}
                  </span>
                )}
              </span>
            )}
          </div>
        )}

        <form onSubmit={handleAssignRole} className="space-y-4">
          {/* Row 1: resource type + resource */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-50 mb-1.5">
                Resource Type
              </label>
              <select
                value={resourceType}
                onChange={(e) => setResourceType(e.target.value as MatrixResourceType)}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="org">Org</option>
                <option value="space">Space</option>
                <option value="room">Room</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-50 mb-1.5">
                Resource
              </label>
              <select
                value={resourceId}
                onChange={(e) => setResourceId(e.target.value)}
                required
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a {resourceType}</option>
                {resourceOptions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: user + role */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-50 mb-1.5">
                User
              </label>
              <input
                type="text"
                placeholder="Search by email or name..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2 text-sm"
              />
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
                size={4}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">Select a user</option>
                {filteredIdentities.map((identity) => (
                  <option key={identity.id} value={identity.id}>
                    {identity.traits?.email || identity.traits?.name || identity.id}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-50 mb-1.5">
                Role
              </label>
              <div className="space-y-2">
                {MATRIX_ROLES.map((r) => (
                  <label
                    key={r}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      role === r
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={r}
                      checked={role === r}
                      onChange={() => setRole(r)}
                      className="sr-only"
                    />
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[r]}`}
                    >
                      {ROLE_LABELS[r]}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {r === "matrix_admin" && "Full control — manage users, roles, spaces, rooms"}
                      {r === "moderator"    && "Manage rooms and users within their scope"}
                      {r === "support"      && "Impersonation + read-only audit access"}
                      {r === "member"       && "Regular participant"}
                      {r === "viewer"       && "Read-only presence"}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !resourceId || !userId}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Assigning..." : "Assign Role"}
          </button>
        </form>
      </div>

      {/* Current Members */}
      {resourceId && (
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              Current Members{members.length > 0 && ` (${members.length})`}
            </h2>
            {/* Role filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All roles</option>
              {MATRIX_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>

          {membersLoading ? (
            <div className="py-8 text-center text-zinc-500 dark:text-zinc-400">Loading members...</div>
          ) : filteredMembers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800">
                    <th className="text-left py-3 px-4 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                      User
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                      Role
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                      Assigned
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((member) => (
                    <tr
                      key={member.id}
                      className="border-b border-zinc-200 dark:border-zinc-800 last:border-0"
                    >
                      <td className="py-3 px-4">
                        <p className="text-sm text-zinc-900 dark:text-zinc-50">
                          {identityLabel(member.userId)}
                        </p>
                        <p className="text-xs text-zinc-500 font-mono">{member.userId}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            ROLE_COLORS[member.role] ?? ""
                          }`}
                        >
                          {ROLE_LABELS[member.role] ?? member.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-zinc-600 dark:text-zinc-400">
                        {new Date(member.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleRemoveRole(member)}
                          className="text-sm text-red-600 dark:text-red-400 hover:underline"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-zinc-600 dark:text-zinc-400 text-sm">
              {roleFilter
                ? `No members with role "${ROLE_LABELS[roleFilter]}" on this ${resourceType}.`
                : `No role assignments yet for this ${resourceType}.`}
            </div>
          )}
        </div>
      )}

      {/* Role reference */}
      <div className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
          Role Descriptions
        </h3>
        <dl className="space-y-2.5 text-sm">
          {MATRIX_ROLES.map((r) => (
            <div key={r} className="flex gap-3">
              <dt>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[r]}`}
                >
                  {ROLE_LABELS[r]}
                </span>
              </dt>
              <dd className="text-zinc-600 dark:text-zinc-400">
                {r === "matrix_admin" &&
                  "Full control at assigned scope — manage users, roles, spaces, rooms, view audit"}
                {r === "moderator" &&
                  "Manage rooms and users within their space/room; view audit at scope"}
                {r === "support" &&
                  "Impersonate users for support sessions; view audit. Cannot manage roles."}
                {r === "member" && "Regular participant. No administrative capability."}
                {r === "viewer" &&
                  "Read-only presence. Cannot send messages (enforced in Matrix)."}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
          Roles assigned at org level are inherited by all spaces and rooms in that org via Keto{" "}
          <code className="font-mono bg-zinc-100 dark:bg-zinc-700 px-1 rounded">#parent</code>{" "}
          relation tuples. Direct grants at lower levels override inherited roles additively (Keto
          has no deny primitive; for restrictive overrides use explicit grants only).
        </p>
      </div>
    </div>
  );
}
