import { getServerSession } from "@ory/nextjs/app";
import { redirect } from "next/navigation";
import { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin-sidebar";
import { PageHeader } from "@/components/page-header";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession();

  if (!session || !session.identity) {
    redirect("/auth/login");
  }

  const traits = session.identity.traits as {
    email?: string;
    name?: { first?: string; last?: string };
    username?: string;
  };
  const userName = traits.name?.first
    ? `${traits.name.first} ${traits.name.last || ""}`.trim()
    : traits.username || "Admin";
  const userEmail = traits.email || "";

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar userName={userName} userEmail={userEmail} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <PageHeader />
        <div className="flex-1 overflow-auto">{children}</div>
      </main>
    </div>
  );
}
