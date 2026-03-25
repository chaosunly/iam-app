"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { AlertCircle, Users } from "lucide-react";

interface GitlabGroup {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
}

export default function GitlabGroupsPage() {
  const [groups, setGroups] = useState<GitlabGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchGroups();
  }, []);

  async function fetchGroups() {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/gitlab/groups");
      if (!response.ok) throw new Error("Failed to fetch groups");
      const data = await response.json();
      setGroups(data.groups || []);
    } catch (err: any) {
      setError(err.message || "Failed to load groups");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(groupId: string, groupName: string) {
    if (!confirm(`Are you sure you want to delete the group "${groupName}"?`)) return;

    try {
      const response = await fetch(`/api/admin/gitlab/groups/${groupId}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete group");
      }
      fetchGroups();
    } catch (err: any) {
      alert(err.message || "Failed to delete group");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading groups...
      </div>
    );
  }

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

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

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
                      onClick={() => handleDelete(group.id, group.name)}
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
    </div>
  );
}
