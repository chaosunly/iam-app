"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface GitlabGroup   { id: string; name: string }
interface GitlabProject { id: string; name: string }
interface Identity      { id: string; traits: { email?: string; name?: string } }

const GITLAB_ROLES = ["owner", "maintainer", "developer", "reporter", "guest"] as const;

const ROLE_BADGE_CLASSES: Record<string, string> = {
  owner:       "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200",
  maintainer:  "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200",
  developer:   "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200",
  reporter:    "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200",
  guest:       "bg-secondary text-secondary-foreground",
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  owner:      "Full control over resource",
  maintainer: "Manage settings and members",
  developer:  "Push code, merge, deploy",
  reporter:   "Read repository and issues",
  guest:      "Minimal read access",
};

export default function GitlabRolesPage() {
  const searchParams = useSearchParams();
  const [resourceType, setResourceType] = useState<"group" | "project">(
    (searchParams.get("resourceType") as "group" | "project") || "project",
  );
  const [resourceId, setResourceId] = useState(searchParams.get("resourceId") || "");
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("developer");

  const [groups, setGroups] = useState<GitlabGroup[]>([]);
  const [projects, setProjects] = useState<GitlabProject[]>([]);
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [members, setMembers] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchGroups();
    fetchProjects();
    fetchIdentities();
  }, []);

  useEffect(() => {
    if (resourceId) fetchMembers();
  }, [resourceType, resourceId]);

  async function fetchGroups() {
    try {
      const response = await fetch("/api/admin/gitlab/groups");
      if (response.ok) { const data = await response.json(); setGroups(data.groups || []); }
    } catch (err) { console.error("Failed to fetch groups:", err); }
  }

  async function fetchProjects() {
    try {
      const response = await fetch("/api/admin/gitlab/projects");
      if (response.ok) { const data = await response.json(); setProjects(data.projects || []); }
    } catch (err) { console.error("Failed to fetch projects:", err); }
  }

  async function fetchIdentities() {
    try {
      const response = await fetch("/api/admin/identities?per_page=250");
      if (response.ok) { const json = await response.json(); setIdentities(json.data || []); }
    } catch (err) { console.error("Failed to fetch identities:", err); }
  }

  async function fetchMembers() {
    if (!resourceId) return;
    try {
      const response = await fetch(
        `/api/admin/gitlab/roles?resourceType=${resourceType}&resourceId=${resourceId}`,
      );
      if (response.ok) { const data = await response.json(); setMembers(data.members || []); }
    } catch (err) { console.error("Failed to fetch members:", err); }
  }

  async function handleAssignRole(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess(""); setLoading(true);

    try {
      const response = await fetch("/api/admin/gitlab/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, resourceType, resourceId, role }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to assign role");
      }
      setSuccess("Role assigned successfully!");
      setUserId("");
      fetchMembers();
    } catch (err: any) {
      setError(err.message || "Failed to assign role");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveRole(_memberId: string, memberUserId: string) {
    if (!confirm("Are you sure you want to remove this role assignment?")) return;

    try {
      const response = await fetch("/api/admin/gitlab/roles", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: memberUserId, resourceType, resourceId }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to remove role");
      }
      fetchMembers();
    } catch (err: any) {
      alert(err.message || "Failed to remove role");
    }
  }

  const resources = resourceType === "group" ? groups : projects;

  function identityLabel(id: string): string {
    const identity = identities.find((i) => i.id === id);
    return identity?.traits?.email || identity?.traits?.name || id;
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
          <Link href="/admin/gitlab">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to GitLab Access
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">GitLab Role Assignments</h1>
        <p className="text-muted-foreground mt-1">Assign and manage GitLab roles for users</p>
      </div>

      {/* Assign Role Form */}
      <Card>
        <CardHeader>
          <CardTitle>Assign Role</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="mb-4 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 [&>svg]:text-green-800 dark:[&>svg]:text-green-200">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleAssignRole} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Resource Type</Label>
                <Select
                  value={resourceType}
                  onValueChange={(v) => setResourceType(v as "group" | "project")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="project">Project</SelectItem>
                    <SelectItem value="group">Group</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Resource</Label>
                <Select value={resourceId} onValueChange={setResourceId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={`Select a ${resourceType}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {resources.map((resource) => (
                      <SelectItem key={resource.id} value={resource.id}>
                        {resource.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>User</Label>
                <Select value={userId} onValueChange={setUserId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {identities.map((identity) => (
                      <SelectItem key={identity.id} value={identity.id}>
                        {identity.traits?.email || identity.traits?.name || identity.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GITLAB_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? "Assigning..." : "Assign Role"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Current Members */}
      {resourceId && (
        <Card>
          <CardHeader>
            <CardTitle>Current Members ({members.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {members.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <p className="text-sm font-medium">{identityLabel(member.userId)}</p>
                        <p className="text-xs text-muted-foreground font-mono">{member.userId}</p>
                      </TableCell>
                      <TableCell>
                        <Badge className={ROLE_BADGE_CLASSES[member.role] ?? ""}>{member.role}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(member.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveRole(member.id, member.userId)}
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center py-8 text-muted-foreground">No role assignments yet.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Role Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Role Descriptions</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-2.5 text-sm">
            {GITLAB_ROLES.map((r) => (
              <div key={r} className="flex gap-3 items-baseline">
                <dt>
                  <Badge className={ROLE_BADGE_CLASSES[r]}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </Badge>
                </dt>
                <dd className="text-muted-foreground">{ROLE_DESCRIPTIONS[r]}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
