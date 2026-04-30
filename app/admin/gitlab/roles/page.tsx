import { getGitlabGroups, getGitlabProjects } from "@/lib/services/gitlab.service";
import { listIdentities } from "@/lib/services/kratos.service";
import { GitlabRolesClient } from "./roles-client";

export const dynamic = "force-dynamic";

export default async function GitlabRolesPage() {
  const [groups, projects, identities] = await Promise.all([
    getGitlabGroups(),
    getGitlabProjects(),
    listIdentities(0, 250),
  ]);

  return (
    <GitlabRolesClient
      initialGroups={groups.map((g) => ({ id: g.id, name: g.name }))}
      initialProjects={projects.map((p) => ({ id: p.id, name: p.name }))}
      initialIdentities={identities.map((i) => ({
        id: i.id,
        traits: { email: i.traits?.email, name: i.traits?.name?.first },
      }))}
    />
  );
}
