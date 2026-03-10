import { getServerSession } from "@ory/nextjs/app";
import { redirect } from "next/navigation";
import { isGlobalAdmin } from "@/lib/services/permission.service";
import Link from "next/link";

export default async function GitlabAccessPage() {
  const session = await getServerSession();

  if (!session?.identity) {
    redirect("/auth/login");
  }

  const userId = session.identity.id;
  const hasAdminAccess = await isGlobalAdmin(userId);

  if (!hasAdminAccess) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          GitLab Access Management
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">
          Manage GitLab-style groups, projects, and role assignments
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Groups Card */}
        <Link
          href="/admin/gitlab/groups"
          className="block p-6 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <svg
                className="w-6 h-6 text-blue-600 dark:text-blue-400"
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
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Groups
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Manage GitLab groups
              </p>
            </div>
          </div>
        </Link>

        {/* Projects Card */}
        <Link
          href="/admin/gitlab/projects"
          className="block p-6 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-green-500 dark:hover:border-green-500 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <svg
                className="w-6 h-6 text-green-600 dark:text-green-400"
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
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Projects
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Manage GitLab projects
              </p>
            </div>
          </div>
        </Link>

        {/* Roles Card */}
        <Link
          href="/admin/gitlab/roles"
          className="block p-6 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-purple-500 dark:hover:border-purple-500 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <svg
                className="w-6 h-6 text-purple-600 dark:text-purple-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Role Assignments
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Assign and manage roles
              </p>
            </div>
          </div>
        </Link>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
          About GitLab Access Management
        </h3>
        <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
          <p>
            This module implements GitLab-style role-based access control with
            the following roles:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>
              <strong>Owner:</strong> Full control over resource
            </li>
            <li>
              <strong>Maintainer:</strong> Manage settings and members
            </li>
            <li>
              <strong>Developer:</strong> Push code, merge, deploy
            </li>
            <li>
              <strong>Reporter:</strong> Read repository and issues
            </li>
            <li>
              <strong>Guest:</strong> Minimal read access
            </li>
          </ul>
          <p className="mt-3">
            Permissions are managed through Ory Keto (Zanzibar-style
            authorization) with support for hierarchical inheritance from groups
            to projects.
          </p>
        </div>
      </div>
    </div>
  );
}
