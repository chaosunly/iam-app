"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

interface GitlabGroup {
  id: string;
  name: string;
}

interface GitlabProject {
  id: string;
  name: string;
}

const GITLAB_ROLES = ["owner", "maintainer", "developer", "reporter", "guest"];

export default function GitlabRolesPage() {
  const searchParams = useSearchParams();
  const [resourceType, setResourceType] = useState<"group" | "project">(
    (searchParams.get("resourceType") as "group" | "project") || "project",
  );
  const [resourceId, setResourceId] = useState(
    searchParams.get("resourceId") || "",
  );
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("developer");

  const [groups, setGroups] = useState<GitlabGroup[]>([]);
  const [projects, setProjects] = useState<GitlabProject[]>([]);
  const [members, setMembers] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchGroups();
    fetchProjects();
  }, []);

  useEffect(() => {
    if (resourceId) {
      fetchMembers();
    }
  }, [resourceType, resourceId]);

  async function fetchGroups() {
    try {
      const response = await fetch("/api/admin/gitlab/groups");
      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups || []);
      }
    } catch (err) {
      console.error("Failed to fetch groups:", err);
    }
  }

  async function fetchProjects() {
    try {
      const response = await fetch("/api/admin/gitlab/projects");
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    }
  }

  async function fetchMembers() {
    if (!resourceId) return;

    try {
      const response = await fetch(
        `/api/admin/gitlab/roles?resourceType=${resourceType}&resourceId=${resourceId}`,
      );

      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
      }
    } catch (err) {
      console.error("Failed to fetch members:", err);
    }
  }

  async function handleAssignRole(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch("/api/admin/gitlab/roles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          resourceType,
          resourceId,
          role,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to assign role");
      }

      setSuccess("Role assigned successfully!");
      setUserId("");
      fetchMembers();
    } catch (err: any) {
      setError(err.message || "Failed to assign role");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveRole(memberId: string, memberUserId: string) {
    if (!confirm("Are you sure you want to remove this role assignment?")) {
      return;
    }

    try {
      const response = await fetch("/api/admin/gitlab/roles", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: memberUserId,
          resourceType,
          resourceId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to remove role");
      }

      fetchMembers();
    } catch (err: any) {
      alert(err.message || "Failed to remove role");
    }
  }

  const resources = resourceType === "group" ? groups : projects;

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          GitLab Role Assignments
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">
          Assign and manage GitLab roles for users
        </p>
      </div>

      {/* Assign Role Form */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
          Assign Role
        </h2>

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-800 dark:text-green-200">
            {success}
          </div>
        )}

        <form onSubmit={handleAssignRole} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-50 mb-2">
                Resource Type
              </label>
              <select
                value={resourceType}
                onChange={(e) =>
                  setResourceType(e.target.value as "group" | "project")
                }
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="project">Project</option>
                <option value="group">Group</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-50 mb-2">
                Resource
              </label>
              <select
                value={resourceId}
                onChange={(e) => setResourceId(e.target.value)}
                required
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a {resourceType}</option>
                {resources.map((resource) => (
                  <option key={resource.id} value={resource.id}>
                    {resource.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-50 mb-2">
                User ID
              </label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
                placeholder="Enter user ID"
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-50 mb-2">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {GITLAB_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Assigning..." : "Assign Role"}
          </button>
        </form>
      </div>

      {/* Current Members */}
      {resourceId && (
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
            Current Members ({members.length})
          </h2>

          {members.length > 0 ? (
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
                      Assigned
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
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
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() =>
                            handleRemoveRole(member.id, member.userId)
                          }
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
            <div className="text-center py-8 text-zinc-600 dark:text-zinc-400">
              No role assignments yet.
            </div>
          )}
        </div>
      )}

      {/* Role Reference */}
      <div className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
          Role Descriptions
        </h3>
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="font-medium text-zinc-900 dark:text-zinc-50">
              Owner:
            </dt>
            <dd className="text-zinc-600 dark:text-zinc-400">
              Full control over resource
            </dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-900 dark:text-zinc-50">
              Maintainer:
            </dt>
            <dd className="text-zinc-600 dark:text-zinc-400">
              Manage settings and members
            </dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-900 dark:text-zinc-50">
              Developer:
            </dt>
            <dd className="text-zinc-600 dark:text-zinc-400">
              Push code, merge, deploy
            </dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-900 dark:text-zinc-50">
              Reporter:
            </dt>
            <dd className="text-zinc-600 dark:text-zinc-400">
              Read repository and issues
            </dd>
          </div>
          <div>
            <dt className="font-medium text-zinc-900 dark:text-zinc-50">
              Guest:
            </dt>
            <dd className="text-zinc-600 dark:text-zinc-400">
              Minimal read access
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
