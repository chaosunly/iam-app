"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface GroupMember {
  userId: string;
  email: string;
  name: string;
}

interface Group {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
}

interface Identity {
  id: string;
  traits: {
    email?: string;
    name?: { first?: string; last?: string };
  };
}

export default function DashboardGroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [availableUsers, setAvailableUsers] = useState<Identity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Edit group state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Add member state
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberUserId, setNewMemberUserId] = useState("");
  const [isAddingMember, setIsAddingMember] = useState(false);

  const loadGroupData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [groupRes, membersRes] = await Promise.all([
        fetch(`/api/admin/groups/${groupId}`),
        fetch(`/api/admin/groups/${groupId}/members`),
      ]);

      if (!groupRes.ok) {
        if (groupRes.status === 403) {
          router.push("/dashboard/groups");
          return;
        }
        throw new Error("Failed to load group");
      }
      if (!membersRes.ok) throw new Error("Failed to load members");

      const groupData = await groupRes.json();
      const membersData = await membersRes.json();

      setGroup(groupData);
      setEditName(groupData.name);
      setEditDescription(groupData.description || "");
      setMembers(membersData.members || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load group");
    } finally {
      setIsLoading(false);
    }
  }, [groupId, router]);

  const loadAvailableUsers = useCallback(async () => {
    try {
      setIsLoadingUsers(true);
      const res = await fetch(`/api/dashboard/groups/${groupId}/users`);
      if (!res.ok) throw new Error("Failed to load users");
      const data = await res.json();
      setAvailableUsers(data.users || []);
    } catch (err) {
      console.error("Failed to load available users:", err);
    } finally {
      setIsLoadingUsers(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadGroupData();
  }, [loadGroupData]);

  useEffect(() => {
    if (showAddMember && availableUsers.length === 0) {
      loadAvailableUsers();
    }
  }, [showAddMember, availableUsers.length, loadAvailableUsers]);

  const getUserDisplayName = (user: Identity) => {
    const first = user.traits.name?.first || "";
    const last = user.traits.name?.last || "";
    const full = `${first} ${last}`.trim();
    return full || user.traits.email || user.id;
  };

  const flash = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    setIsSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update group");
      }

      await loadGroupData();
      setIsEditing(false);
      flash("Group updated successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update group");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberUserId) return;
    setIsAddingMember(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/groups/${groupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: newMemberUserId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add member");
      }

      setNewMemberUserId("");
      setShowAddMember(false);
      setAvailableUsers([]);
      await loadGroupData();
      flash("Member added successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add member");
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("Remove this member from the group?")) return;
    setError("");

    try {
      const res = await fetch(
        `/api/admin/groups/${groupId}/members/${userId}`,
        { method: "DELETE" },
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove member");
      }

      setAvailableUsers([]);
      await loadGroupData();
      flash("Member removed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    }
  };

  const handleDeleteGroup = async () => {
    if (!confirm(`Delete "${group?.name}"? This cannot be undone.`)) return;
    setError("");

    try {
      const res = await fetch(`/api/admin/groups/${groupId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete group");
      }

      router.push("/dashboard/groups");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete group");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <span className="text-muted-foreground">Loading…</span>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <span className="text-destructive">Group not found</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 md:p-8 max-w-4xl">
      {/* Back link */}
      <Link
        href="/dashboard/groups"
        className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to My Groups
      </Link>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-900 dark:text-red-100">{error}</p>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-900 dark:text-green-100">
            {successMsg}
          </p>
        </div>
      )}

      {/* Group Info */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-start gap-4">
          {isEditing ? (
            <form onSubmit={handleSaveEdit} className="flex-1 space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Group Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Optional description"
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSaving ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-zinc-300 dark:border-zinc-600 text-sm rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {group.name}
              </h1>
              {group.description && (
                <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm">
                  {group.description}
                </p>
              )}
            </div>
          )}

          {!isEditing && (
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-2 border border-zinc-300 dark:border-zinc-600 text-sm rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                Edit
              </button>
              <button
                onClick={handleDeleteGroup}
                className="px-3 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Members Section */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Members ({members.length})</h2>
          <button
            onClick={() => setShowAddMember(!showAddMember)}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
          >
            Add Member
          </button>
        </div>

        {showAddMember && (
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Select User
                </label>
                {isLoadingUsers ? (
                  <p className="text-sm text-muted-foreground">
                    Loading users…
                  </p>
                ) : (
                  <select
                    value={newMemberUserId}
                    onChange={(e) => setNewMemberUserId(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-sm"
                  >
                    <option value="">— choose a user —</option>
                    {availableUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {getUserDisplayName(user)}
                        {user.traits.email ? ` (${user.traits.email})` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isAddingMember || !newMemberUserId}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isAddingMember ? "Adding…" : "Add Member"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddMember(false);
                    setNewMemberUserId("");
                  }}
                  className="px-4 py-2 border border-zinc-300 dark:border-zinc-600 text-sm rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {members.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">
              No members yet.
            </p>
          ) : (
            members.map((member) => (
              <div
                key={member.userId}
                className="p-4 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium">
                    {member.name || member.email || member.userId}
                  </p>
                  {member.email && member.name && (
                    <p className="text-xs text-muted-foreground">
                      {member.email}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveMember(member.userId)}
                  className="text-xs text-red-600 hover:text-red-700 font-medium"
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
