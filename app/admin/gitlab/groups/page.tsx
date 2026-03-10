"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface GitlabGroup {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
}

export default function GitlabGroupsPage() {
  const [groups, setGroups] = useState<GitlabGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchGroups();
  }, []);

  async function fetchGroups() {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/gitlab/groups");

      if (!response.ok) {
        throw new Error("Failed to fetch groups");
      }

      const data = await response.json();
      setGroups(data.groups || []);
    } catch (err: any) {
      setError(err.message || "Failed to load groups");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(groupId: string, groupName: string) {
    if (!confirm(`Are you sure you want to delete the group "${groupName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/gitlab/groups/${groupId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete group");
      }

      // Refresh list
      fetchGroups();
    } catch (err: any) {
      alert(err.message || "Failed to delete group");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-600 dark:text-zinc-400">
          Loading groups...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            GitLab Groups
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            Manage GitLab groups and their members
          </p>
        </div>
        <Link
          href="/admin/gitlab/groups/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Create Group
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        {groups.length > 0 ? (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {groups.map((group) => (
              <div
                key={group.id}
                className="p-6 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Link
                      href={`/admin/gitlab/groups/${group.id}`}
                      className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      {group.name}
                    </Link>
                    {group.description && (
                      <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                        {group.description}
                      </p>
                    )}
                    <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-2">
                      Created {new Date(group.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/gitlab/groups/${group.id}`}
                      className="px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                    >
                      View Details
                    </Link>
                    <button
                      onClick={() => handleDelete(group.id, group.name)}
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
            <svg
              className="mx-auto h-12 w-12 text-zinc-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-zinc-900 dark:text-zinc-50">
              No groups yet
            </h3>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              Get started by creating a new GitLab group.
            </p>
            <Link
              href="/admin/gitlab/groups/new"
              className="mt-6 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Create Group
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
