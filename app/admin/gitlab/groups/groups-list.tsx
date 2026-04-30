// app/admin/gitlab/groups/groups-list.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Users } from "lucide-react";
import { DeleteDialog } from "@/components/admin/delete-dialog";

interface GitlabGroup {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
}

interface Props {
  groups: GitlabGroup[];
}

export function GitlabGroupsList({ groups }: Props) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const response = await fetch(`/api/admin/gitlab/groups/${deleteTarget.id}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to delete group");
    }
    router.refresh();
  };

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">GitLab Groups</h1>
          <p className="text-muted-foreground mt-1">Manage GitLab groups and their members</p>
        </div>
        <Button asChild>
          <Link href="/admin/gitlab/groups/new">Create Group</Link>
        </Button>
      </div>

      <Card className="p-0 gap-0">
        {groups.length > 0 ? (
          <div className="divide-y">
            {groups.map((group) => (
              <div key={group.id} className="p-6 hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Link
                      href={`/admin/gitlab/groups/${group.id}`}
                      className="text-lg font-semibold hover:text-primary transition-colors"
                    >
                      {group.name}
                    </Link>
                    {group.description && (
                      <p className="text-muted-foreground mt-1 text-sm">{group.description}</p>
                    )}
                    <p className="text-sm text-muted-foreground mt-2">
                      Created {new Date(group.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/admin/gitlab/groups/${group.id}`}>View Details</Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteTarget({ id: group.id, name: group.name })}
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
            <Users className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="mt-4 text-lg font-medium">No groups yet</h3>
            <p className="mt-2 text-muted-foreground">
              Get started by creating a new GitLab group.
            </p>
            <Button asChild className="mt-6">
              <Link href="/admin/gitlab/groups/new">Create Group</Link>
            </Button>
          </div>
        )}
      </Card>

      <DeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Group"
        description={
          deleteTarget
            ? `This will permanently delete the group "${deleteTarget.name}". This action cannot be undone.`
            : ""
        }
        successMessage="Group deleted successfully"
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
