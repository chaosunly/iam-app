"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle } from "lucide-react";

interface GitlabProject {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  group?: { id: string; name: string } | null;
  members: Array<{
    id: string;
    userId: string;
    role: string;
    createdAt: string;
  }>;
}

export default function GitlabProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<GitlabProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (projectId) fetchProject();
  }, [projectId]);

  async function fetchProject() {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/gitlab/projects/${projectId}`);
      if (!response.ok) throw new Error("Failed to fetch project");
      const data = await response.json();
      setProject(data.project);
    } catch (err: any) {
      setError(err.message || "Failed to load project");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading project...
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="space-y-4 p-6 md:p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || "Project not found"}</AlertDescription>
        </Alert>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/admin/gitlab/projects">← Back to Projects</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/admin/gitlab/projects">← Back to Projects</Link>
        </Button>
        <div className="flex items-center gap-3 mt-2">
          <h1 className="text-3xl font-bold">{project.name}</h1>
          {project.group && (
            <Badge asChild variant="secondary">
              <Link href={`/admin/gitlab/groups/${project.group.id}`}>
                {project.group.name}
              </Link>
            </Badge>
          )}
        </div>
        {project.description && (
          <p className="text-muted-foreground mt-1">{project.description}</p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Project ID</dt>
              <dd className="font-mono mt-1">{project.id}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Created</dt>
              <dd className="mt-1">{new Date(project.createdAt).toLocaleString()}</dd>
            </div>
            {project.group && (
              <div>
                <dt className="text-muted-foreground">Parent Group</dt>
                <dd className="mt-1">
                  <Link
                    href={`/admin/gitlab/groups/${project.group.id}`}
                    className="text-primary hover:underline"
                  >
                    {project.group.name}
                  </Link>
                </dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Members ({project.members.length})</CardTitle>
          <Button asChild size="sm">
            <Link href={`/admin/gitlab/roles?resourceType=project&resourceId=${project.id}`}>
              Manage Members
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {project.members.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {project.members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-mono text-xs">{member.userId}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{member.role}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(member.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-8 text-muted-foreground">
              No members yet. Add members to get started.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
