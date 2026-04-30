"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Folder } from "lucide-react";
import { DeleteDialog } from "@/components/admin/delete-dialog";

interface GitlabProject {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  group?: { id: string; name: string } | null;
}

interface Props {
  projects: GitlabProject[];
}

export function GitlabProjectsList({ projects }: Props) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const response = await fetch(`/api/admin/gitlab/projects/${deleteTarget.id}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to delete project");
    }
    router.refresh();
  };

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">GitLab Projects</h1>
          <p className="text-muted-foreground mt-1">Manage GitLab projects and their members</p>
        </div>
        <Button asChild>
          <Link href="/admin/gitlab/projects/new">Create Project</Link>
        </Button>
      </div>

      <Card className="p-0 gap-0">
        {projects.length > 0 ? (
          <div className="divide-y">
            {projects.map((project) => (
              <div key={project.id} className="p-6 hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/gitlab/projects/${project.id}`}
                        className="text-lg font-semibold hover:text-primary transition-colors"
                      >
                        {project.name}
                      </Link>
                      {project.group && (
                        <Badge asChild variant="secondary">
                          <Link href={`/admin/gitlab/groups/${project.group.id}`}>
                            {project.group.name}
                          </Link>
                        </Badge>
                      )}
                    </div>
                    {project.description && (
                      <p className="text-muted-foreground mt-1 text-sm">{project.description}</p>
                    )}
                    <p className="text-sm text-muted-foreground mt-2">
                      Created {new Date(project.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/admin/gitlab/projects/${project.id}`}>View Details</Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteTarget({ id: project.id, name: project.name })}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <Folder className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="mt-4 text-lg font-medium">No projects yet</h3>
            <p className="mt-2 text-muted-foreground">
              Get started by creating a new GitLab project.
            </p>
            <Button asChild className="mt-6">
              <Link href="/admin/gitlab/projects/new">Create Project</Link>
            </Button>
          </div>
        )}
      </Card>

      <DeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Project"
        description={
          deleteTarget
            ? `This will permanently delete the project "${deleteTarget.name}". This action cannot be undone.`
            : ""
        }
        successMessage="Project deleted successfully"
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
