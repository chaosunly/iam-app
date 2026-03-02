"use client";

import { useState, useEffect } from "react";
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
    name?: {
      first?: string;
      last?: string;
    };
  };
}

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [allUsers, setAllUsers] = useState<Identity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [error, setError] = useState("");
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberUserId, setNewMemberUserId] = useState("");
  const [isAddingMember, setIsAddingMember] = useState(false);

  useEffect(() => {
    loadGroupData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  useEffect(() => {
    if (showAddMember && allUsers.length === 0) {
      loadAllUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAddMember]);

  const loadGroupData = async () => {
    try {
      setIsLoading(true);
      const [groupRes, membersRes] = await Promise.all([
        fetch(`/api/admin/groups/${groupId}`),
        fetch(`/api/admin/groups/${groupId}/members`),
      ]);

      if (!groupRes.ok) throw new Error("Failed to load group");
      if (!membersRes.ok) throw new Error("Failed to load members");

      const groupData = await groupRes.json();
      const membersData = await membersRes.json();

      setGroup(groupData);
      setMembers(membersData.members || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load group");
    } finally {
      setIsLoading(false);
    }
  };

  const loadAllUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const response = await fetch("/api/admin/identities");

      if (!response.ok) throw new Error("Failed to load users");

      const result = await response.json();
      // API returns { data: [...], status: 200 }
      const users = Array.isArray(result.data) ? result.data : [];
      setAllUsers(users);
    } catch (err) {
      console.error("Failed to load users:", err);
      setError(err instanceof Error ? err.message : "Failed to load users");
      setAllUsers([]); // Ensure it's always an array
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Get available users (not already members)
  const availableUsers = allUsers.filter(
    (user) => !members.some((member) => member.userId === user.id),
  );

  const getUserDisplayName = (user: Identity) => {
    const firstName = user.traits.name?.first || "";
    const lastName = user.traits.name?.last || "";
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || user.traits.email || user.id;
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingMember(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/groups/${groupId}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: newMemberUserId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add member");
      }

      setNewMemberUserId("");
      setShowAddMember(false);
      await loadGroupData();
      // Reload users to update available list
      await loadAllUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add member");
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;

    try {
      const response = await fetch(
        `/api/admin/groups/${groupId}/members/${userId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to remove member");
      }

      await loadGroupData();
      // Reload users to update available list
      if (allUsers.length > 0) {
        await loadAllUsers();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    }
  };

  const handleDeleteGroup = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this group? This action cannot be undone.",
      )
    )
      return;

    try {
      const response = await fetch(`/api/admin/groups/${groupId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete group");
      }

      router.push("/admin/groups");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete group");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <div className="text-zinc-600 dark:text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <div className="text-red-600 dark:text-red-400">Group not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/groups"
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 mb-4"
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
          Back to Groups
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              {group.name}
            </h1>
            {group.description && (
              <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                {group.description}
              </p>
            )}
          </div>
          <button
            onClick={handleDeleteGroup}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Delete Group
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-900 dark:text-red-100">{error}</p>
        </div>
      )}

      {/* Members Section */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              Members ({members.length})
            </h2>
            <button
              onClick={() => setShowAddMember(!showAddMember)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Add Member
            </button>
          </div>
        </div>

        {showAddMember && (
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label
                  htmlFor="userId"
                  className="block text-sm font-medium text-zinc-900 dark:text-zinc-50 mb-2"
                >
                  Select User
                </label>
                {isLoadingUsers ? (
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">
                    Loading users...
                  </div>
                ) : availableUsers.length === 0 ? (
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">
                    No available users to add. All users are already members.
                  </div>
                ) : (
                  <select
                    id="userId"
                    value={newMemberUserId}
                    onChange={(e) => setNewMemberUserId(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Select a user --</option>
                    {availableUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {getUserDisplayName(user)}
                        {user.traits.email && ` (${user.traits.email})`}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddMember(false)}
                  className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md text-zinc-900 dark:text-zinc-50 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isAddingMember ||
                    !newMemberUserId ||
                    availableUsers.length === 0
                  }
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isAddingMember ? "Adding..." : "Add Member"}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {members.length > 0 ? (
            members.map((member) => (
              <div
                key={member.userId}
                className="p-6 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-zinc-600 dark:text-zinc-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-50">
                      {member.name || member.userId}
                    </p>
                    {member.email && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {member.email}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveMember(member.userId)}
                  className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Remove
                </button>
              </div>
            ))
          ) : (
            <div className="p-12 text-center">
              <p className="text-zinc-600 dark:text-zinc-400">
                No members in this group yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
