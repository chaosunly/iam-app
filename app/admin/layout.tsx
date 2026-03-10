import { getServerSession } from "@ory/nextjs/app";
import { redirect } from "next/navigation";
import { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin-sidebar";

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
    <div className="flex min-h-screen">
      <AdminSidebar userName={userName} userEmail={userEmail} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
