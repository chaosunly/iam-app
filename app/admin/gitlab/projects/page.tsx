"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface GitlabProject {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  group?: {
    id: string;
    name: string;
  } | null;
}

export default function GitlabProjectsPage() {
  const [projects, setProjects] = useState<GitlabProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/gitlab/projects");

      if (!response.ok) {
        throw new Error("Failed to fetch projects");
      }

      const data = await response.json();
      setProjects(data.projects || []);
    } catch (err: any) {
      setError(err.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(projectId: string, projectName: string) {
    if (
      !confirm(`Are you sure you want to delete the project "${projectName}"?`)
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/gitlab/projects/${projectId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete project");
      }

      // Refresh list
      fetchProjects();
    } catch (err: any) {
      alert(err.message || "Failed to delete project");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-600 dark:text-zinc-400">
          Loading projects...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            GitLab Projects
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            Manage GitLab projects and their members
          </p>
        </div>
        <Link
          href="/admin/gitlab/projects/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Create Project
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        {projects.length > 0 ? (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {projects.map((project) => (
              <div
                key={project.id}
                className="p-6 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/admin/gitlab/projects/${project.id}`}
                        className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        {project.name}
                      </Link>
                      {project.group && (
                        <Link
                          href={`/admin/gitlab/groups/${project.group.id}`}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
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
                    <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-2">
                      Created {new Date(project.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/gitlab/projects/${project.id}`}
                      className="px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                    >
                      View Details
                    </Link>
                    <button
                      onClick={() => handleDelete(project.id, project.name)}
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
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-zinc-900 dark:text-zinc-50">
              No projects yet
            </h3>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              Get started by creating a new GitLab project.
            </p>
            <Link
              href="/admin/gitlab/projects/new"
              className="mt-6 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Create Project
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
