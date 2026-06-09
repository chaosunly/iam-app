import { getServerSession } from "@ory/nextjs/app";
import { redirect } from "next/navigation";
import { canAccessAdmin } from "@/lib/services/permission.service";
import { KeyDetail } from "./key-detail";

interface Props {
  params: { id: string };
}

export default async function KeyDetailPage({ params }: Props) {
  const session = await getServerSession();
  if (!session?.identity) redirect("/auth/login");
  const hasAdminAccess = await canAccessAdmin(session.identity.id);
  if (!hasAdminAccess) redirect("/dashboard");

  const { id } = params;
  return <KeyDetail id={id} />;
}
