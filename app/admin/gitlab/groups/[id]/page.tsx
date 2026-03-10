"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface GitlabGroup {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  members: Array<{
    id: string;
    userId: string;
    role: string;
    createdAt: string;
  }>;
}

export default function GitlabGroupDetailPage() {
  const params = useParams();
  const groupId = params.id as string;

  const [group, setGroup] = useState<GitlabGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (groupId) {
      fetchGroup();
    }
  }, [groupId]);

  async function fetchGroup() {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/gitlab/groups/${groupId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch group");
      }

      const data = await response.json();
      setGroup(data.group);
    } catch (err: any) {
      setError(err.message || "Failed to load group");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-600 dark:text-zinc-400">Loading group...</div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
          {error || "Group not found"}
        </div>
        <Link
          href="/admin/gitlab/groups"
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          ← Back to Groups
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/gitlab/groups"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          ← Back to Groups
        </Link>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mt-2">
          {group.name}
        </h1>
        {group.description && (
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            {group.description}
          </p>
        )}
      </div>

      {/* Group Info */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
          Group Information
        </h2>
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm text-zinc-600 dark:text-zinc-400">
              Group ID
            </dt>
            <dd className="text-sm font-mono text-zinc-900 dark:text-zinc-50 mt-1">
              {group.id}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-zinc-600 dark:text-zinc-400">
              Created
            </dt>
            <dd className="text-sm text-zinc-900 dark:text-zinc-50 mt-1">
              {new Date(group.createdAt).toLocaleString()}
            </dd>
          </div>
        </dl>
      </div>

      {/* Members */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Members ({group.members.length})
          </h2>
          <Link
            href={`/admin/gitlab/roles?resourceType=group&resourceId=${group.id}`}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
          >
            Manage Members
          </Link>
        </div>

        {group.members.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="text-left py-3 px-4 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                    User ID
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                    Role
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                    Added
                  </th>
                </tr>
              </thead>
              <tbody>
                {group.members.map((member) => (
                  <tr
                    key={member.id}
                    className="border-b border-zinc-200 dark:border-zinc-800 last:border-0"
                  >
                    <td className="py-3 px-4 text-sm font-mono text-zinc-900 dark:text-zinc-50">
                      {member.userId}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                        {member.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-zinc-600 dark:text-zinc-400">
                      {new Date(member.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-zinc-600 dark:text-zinc-400">
            No members yet. Add members to get started.
          </div>
        )}
      </div>
    </div>
  );
}
