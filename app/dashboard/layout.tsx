import { getServerSession } from "@ory/nextjs/app";
import { redirect } from "next/navigation";
import { ReactNode } from "react";
import { UserSidebar } from "@/components/user-sidebar";
import { isGlobalAdmin } from "@/lib/services/permission.service";
import { PageHeader } from "@/components/page-header";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession();

  if (!session || !session.identity) {
    redirect("/auth/login");
  }

  const userId = session.identity.id;
  const hasAdminAccess = await isGlobalAdmin(userId);

  const traits = session.identity.traits as {
    email?: string;
    name?: { first?: string; last?: string };
    username?: string;
  };
  const userName = traits.name?.first
    ? `${traits.name.first} ${traits.name.last || ""}`.trim()
    : traits.username || "User";
  const userEmail = traits.email || "";

  return (
    <div className="flex h-screen overflow-hidden">
      <UserSidebar
        isAdmin={hasAdminAccess}
        userName={userName}
        userEmail={userEmail}
      />
      <main className="flex-1 flex flex-col overflow-hidden">
        <PageHeader />
        <div className="flex-1 overflow-auto">{children}</div>
      </main>
    </div>
  );
}
