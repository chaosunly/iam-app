"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface GitlabProject {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  group?: {
    id: string;
    name: string;
  } | null;
  members: Array<{
    id: string;
    userId: string;
    role: string;
    createdAt: string;
  }>;
}

export default function GitlabProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<GitlabProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  async function fetchProject() {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/gitlab/projects/${projectId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch project");
      }

      const data = await response.json();
      setProject(data.project);
    } catch (err: any) {
      setError(err.message || "Failed to load project");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-600 dark:text-zinc-400">
          Loading project...
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
          {error || "Project not found"}
        </div>
        <Link
          href="/admin/gitlab/projects"
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          ← Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div>
        <Link
          href="/admin/gitlab/projects"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          ← Back to Projects
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            {project.name}
          </h1>
          {project.group && (
            <Link
              href={`/admin/gitlab/groups/${project.group.id}`}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            >
              {project.group.name}
            </Link>
          )}
        </div>
        {project.description && (
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            {project.description}
          </p>
        )}
      </div>

      {/* Project Info */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
          Project Information
        </h2>
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm text-zinc-600 dark:text-zinc-400">
              Project ID
            </dt>
            <dd className="text-sm font-mono text-zinc-900 dark:text-zinc-50 mt-1">
              {project.id}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-zinc-600 dark:text-zinc-400">
              Created
            </dt>
            <dd className="text-sm text-zinc-900 dark:text-zinc-50 mt-1">
              {new Date(project.createdAt).toLocaleString()}
            </dd>
          </div>
          {project.group && (
            <div>
              <dt className="text-sm text-zinc-600 dark:text-zinc-400">
                Parent Group
              </dt>
              <dd className="text-sm text-zinc-900 dark:text-zinc-50 mt-1">
                <Link
                  href={`/admin/gitlab/groups/${project.group.id}`}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {project.group.name}
                </Link>
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Members */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Members ({project.members.length})
          </h2>
          <Link
            href={`/admin/gitlab/roles?resourceType=project&resourceId=${project.id}`}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
          >
            Manage Members
          </Link>
        </div>

        {project.members.length > 0 ? (
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
                {project.members.map((member) => (
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
