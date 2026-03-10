import { getServerSession } from "@ory/nextjs/app";
import { redirect } from "next/navigation";
import { ReactNode } from "react";
import { UserSidebar } from "@/components/user-sidebar";
import { isGlobalAdmin } from "@/lib/services/permission.service";

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

  return (
    <div className="flex min-h-screen">
      <UserSidebar isAdmin={hasAdminAccess} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
