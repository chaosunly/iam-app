import { getGitlabProjects } from "@/lib/services/gitlab.service";
import { GitlabProjectsList } from "./projects-list";

export const dynamic = "force-dynamic";

export default async function GitlabProjectsPage() {
  const projects = await getGitlabProjects();
  const serialized = projects.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    createdAt: p.createdAt.toISOString(),
    group: p.group ? { id: p.group.id, name: p.group.name } : null,
  }));
  return <GitlabProjectsList projects={serialized} />;
}
