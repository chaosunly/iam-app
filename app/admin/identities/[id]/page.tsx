import { notFound } from "next/navigation";
import { getIdentity } from "@/lib/services/kratos.service";
import { listUserPermissions } from "@/lib/services/keto.service";
import { getUserGitlabRoles } from "@/lib/services/gitlab.service";
import { IdentityDetail } from "./identity-detail";

export const dynamic = "force-dynamic";

export default async function IdentityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let identity;
  try {
    identity = await getIdentity(id);
  } catch {
    notFound();
  }

  const [permissions, gitlabRoles] = await Promise.all([
    listUserPermissions(id),
    getUserGitlabRoles(id),
  ]);

  const accessInfo = {
    globalRoles: permissions
      .filter((p) => p.namespace === "GlobalRole")
      .map((p) => ({ role: p.relation === "members" ? p.object : p.relation, object: p.object })),
    orgRoles: permissions
      .filter((p) => p.namespace === "Organization")
      .map((p) => ({ organizationId: p.object, role: p.relation })),
    groupMemberships: permissions
      .filter((p) => p.namespace === "Group")
      .map((p) => ({ groupId: p.object, role: p.relation })),
    gitlabAccess: gitlabRoles.map((r) => ({
      resourceType: r.resourceType,
      resourceId: r.resourceId,
      role: r.role,
    })),
  };

  return <IdentityDetail identity={identity} accessInfo={accessInfo} />;
}
