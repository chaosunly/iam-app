// app/admin/gitlab/groups/page.tsx
import { getGitlabGroups } from "@/lib/services/gitlab.service";
import { GitlabGroupsList } from "./groups-list";

export const dynamic = "force-dynamic";

export default async function GitlabGroupsPage() {
  const groups = await getGitlabGroups();
  const serialized = groups.map((g) => ({
    id: g.id,
    name: g.name,
    description: g.description,
    createdAt: g.createdAt.toISOString(),
  }));
  return <GitlabGroupsList groups={serialized} />;
}
