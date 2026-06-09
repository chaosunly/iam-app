import { getServerSession } from "@ory/nextjs/app";
import { redirect } from "next/navigation";
import { canAccessAdmin } from "@/lib/services/permission.service";
import { CreateKeyForm } from "./create-key-form";

export default async function NewKeyPage() {
  const session = await getServerSession();

  if (!session?.identity) {
    redirect("/auth/login");
  }

  const userId = session.identity.id;
  const hasAdminAccess = await canAccessAdmin(userId);
  if (!hasAdminAccess) {
    redirect("/dashboard");
  }

  return <CreateKeyForm />;
}
