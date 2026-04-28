"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function NewGitlabGroupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/admin/gitlab/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create group");
      }

      const data = await response.json();
      router.push(`/admin/gitlab/groups/${data.group.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to create group");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6 p-6 md:p-8">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
          <Link href="/admin/gitlab/groups">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to Groups
          </Link>
        </Button>
        <h1 className="text-3xl font-bold mt-2">Create GitLab Group</h1>
        <p className="text-muted-foreground mt-1">
          Create a new GitLab group for organizing projects and teams
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Group Details</CardTitle>
          <CardDescription>Configure the name and description for your new group.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">
                Group Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g., backend-team"
              />
              <p className="text-xs text-muted-foreground">Choose a unique name for your group</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Describe the purpose of this group"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button asChild variant="outline">
                <Link href="/admin/gitlab/groups">Cancel</Link>
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Group"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
