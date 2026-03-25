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

interface GitlabGroup {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  members: Array<{
    id: string;
    userId: string;
    role: string;
    createdAt: string;
  }>;
}

export default function GitlabGroupDetailPage() {
  const params = useParams();
  const groupId = params.id as string;

  const [group, setGroup] = useState<GitlabGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (groupId) fetchGroup();
  }, [groupId]);

  async function fetchGroup() {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/gitlab/groups/${groupId}`);
      if (!response.ok) throw new Error("Failed to fetch group");
      const data = await response.json();
      setGroup(data.group);
    } catch (err: any) {
      setError(err.message || "Failed to load group");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading group...
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="space-y-4 p-6 md:p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || "Group not found"}</AlertDescription>
        </Alert>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/admin/gitlab/groups">← Back to Groups</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/admin/gitlab/groups">← Back to Groups</Link>
        </Button>
        <h1 className="text-3xl font-bold mt-2">{group.name}</h1>
        {group.description && (
          <p className="text-muted-foreground mt-1">{group.description}</p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Group Information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Group ID</dt>
              <dd className="font-mono mt-1">{group.id}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Created</dt>
              <dd className="mt-1">{new Date(group.createdAt).toLocaleString()}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Members ({group.members.length})</CardTitle>
          <Button asChild size="sm">
            <Link href={`/admin/gitlab/roles?resourceType=group&resourceId=${group.id}`}>
              Manage Members
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {group.members.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.members.map((member) => (
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
