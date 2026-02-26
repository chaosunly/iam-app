import { getServerSession } from "@ory/nextjs/app";
import { redirect } from "next/navigation";
import { isGlobalAdmin } from "@/lib/services/permission.service";
import { getOrganizationGroups } from "@/lib/services/group.service";
import { getDefaultOrganizationId } from "@/lib/services/organization.service";
import Link from "next/link";

export default async function AdminGroupsPage() {
  const session = await getServerSession();

  if (!session?.identity) {
    redirect("/auth/login");
  }

  const userId = session.identity.id;
  const hasAdminAccess = await isGlobalAdmin(userId);

  if (!hasAdminAccess) {
    redirect("/dashboard");
  }

  // Get organization groups
  const organizationId = getDefaultOrganizationId();
  const groups = await getOrganizationGroups(organizationId);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            Groups
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            Manage organization groups and their members
          </p>
        </div>
        <Link
          href="/admin/groups/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Create Group
        </Link>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        {groups.length > 0 ? (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {groups.map((group) => (
              <Link
                key={group.id}
                href={`/admin/groups/${encodeURIComponent(group.id)}`}
                className="flex items-center justify-between p-6 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
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
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                      {group.name}
                    </h3>
                    {group.description && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                        {group.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    {group.memberCount || 0} members
                  </span>
                  <svg
                    className="w-5 h-5 text-zinc-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <svg
              className="w-16 h-16 text-zinc-400 mx-auto mb-4"
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
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
              No groups yet
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              Create your first group to organize users
            </p>
            <Link
              href="/admin/groups/new"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Create Group
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
