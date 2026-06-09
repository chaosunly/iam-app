import { getServerSession } from "@ory/nextjs/app";
import { redirect } from "next/navigation";
import { canAccessAdmin } from "@/lib/services/permission.service";
import { TalosKeyList } from "./key-list";

export default async function TalosKeysPage() {
  const session = await getServerSession();

  if (!session?.identity) {
    redirect("/auth/login");
  }

  const userId = session.identity.id;
  const hasAdminAccess = await canAccessAdmin(userId);
  if (!hasAdminAccess) {
    redirect("/dashboard");
  }

  return <TalosKeyList />;
}
