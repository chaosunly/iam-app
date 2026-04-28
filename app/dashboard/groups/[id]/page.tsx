"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FormErrorAlert } from "@/components/ui/form-error-alert";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GroupMember {
  userId: string;
  email: string;
  name: string;
}

interface Group {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
}

interface Identity {
  id: string;
  traits: {
    email?: string;
    name?: { first?: string; last?: string };
  };
}

function getInitials(name: string, email: string): string {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length >= 2)
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  if (parts.length === 1 && parts[0].length >= 2)
    return parts[0].slice(0, 2).toUpperCase();
  return email.slice(0, 2).toUpperCase();
}

export default function DashboardGroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [availableUsers, setAvailableUsers] = useState<Identity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Edit sheet
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState("");

  // Add member sheet
  const [addOpen, setAddOpen] = useState(false);
  const [newMemberUserId, setNewMemberUserId] = useState("");
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [addError, setAddError] = useState("");

  const loadGroupData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [groupRes, membersRes] = await Promise.all([
        fetch(`/api/admin/groups/${groupId}`),
        fetch(`/api/admin/groups/${groupId}/members`),
      ]);

      if (!groupRes.ok) {
        if (groupRes.status === 403) {
          router.push("/dashboard/groups");
          return;
        }
        throw new Error("Failed to load group");
      }
      if (!membersRes.ok) throw new Error("Failed to load members");

      const groupData = await groupRes.json();
      const membersData = await membersRes.json();

      setGroup(groupData);
      setMembers(membersData.members || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load group");
    } finally {
      setIsLoading(false);
    }
  }, [groupId, router]);

  const loadAvailableUsers = useCallback(async () => {
    try {
      setIsLoadingUsers(true);
      const res = await fetch(`/api/dashboard/groups/${groupId}/users`);
      if (!res.ok) throw new Error("Failed to load users");
      const data = await res.json();
      setAvailableUsers(data.users || []);
    } catch (err) {
      console.error("Failed to load available users:", err);
    } finally {
      setIsLoadingUsers(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadGroupData();
  }, [loadGroupData]);

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    setIsSaving(true);
    setEditError("");

    try {
      const res = await fetch(`/api/admin/groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update group");
      }

      await loadGroupData();
      setEditOpen(false);
      toast.success("Group updated");
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update group");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberUserId) return;
    setIsAddingMember(true);
    setAddError("");

    try {
      const res = await fetch(`/api/admin/groups/${groupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: newMemberUserId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add member");
      }

      setNewMemberUserId("");
      setAddOpen(false);
      setAvailableUsers([]);
      await loadGroupData();
      toast.success("Member added");
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add member");
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("Remove this member from the group?")) return;

    try {
      const res = await fetch(
        `/api/admin/groups/${groupId}/members/${userId}`,
        { method: "DELETE" },
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove member");
      }

      setAvailableUsers([]);
      await loadGroupData();
      toast.success("Member removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove member");
    }
  };

  const handleDeleteGroup = async () => {
    if (!confirm(`Delete "${group?.name}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/admin/groups/${groupId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete group");
      }

      router.push("/dashboard/groups");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete group");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <span className="text-muted-foreground">Loading…</span>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <span className="text-destructive">Group not found</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 md:p-8 max-w-3xl">
      {/* Back link */}
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/dashboard/groups">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to My Groups
        </Link>
      </Button>

      {/* Group Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{group.name}</CardTitle>
          {group.description && (
            <CardDescription>{group.description}</CardDescription>
          )}
          <CardAction>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditName(group.name);
                  setEditDescription(group.description || "");
                  setEditError("");
                  setEditOpen(true);
                }}
              >
                Edit
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDeleteGroup}>
                Delete
              </Button>
            </div>
          </CardAction>
        </CardHeader>
      </Card>

      {/* Members Card */}
      <Card>
        <CardHeader>
          <CardTitle>Members ({members.length})</CardTitle>
          <CardAction>
            <Button
              size="sm"
              onClick={() => {
                setAddError("");
                setNewMemberUserId("");
                setAddOpen(true);
                if (availableUsers.length === 0) loadAvailableUsers();
              }}
            >
              Add Member
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {members.length === 0 ? (
            <p className="px-6 py-8 text-sm text-muted-foreground text-center">
              No members yet.
            </p>
          ) : (
            <div className="divide-y">
              {members.map((member) => {
                const displayName = member.name || member.email || member.userId;
                const initials = getInitials(
                  member.name || "",
                  member.email || member.userId,
                );
                return (
                  <div
                    key={member.userId}
                    className="flex items-center justify-between px-6 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0">
                        {initials}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{displayName}</p>
                        {member.email && member.name && (
                          <p className="text-xs text-muted-foreground">
                            {member.email}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveMember(member.userId)}
                    >
                      Remove
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Group Sheet */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Edit Group</SheetTitle>
            <SheetDescription>
              Update the group name and description.
            </SheetDescription>
          </SheetHeader>
          <form
            onSubmit={handleSaveEdit}
            className="flex flex-col gap-4 px-4"
          >
            <FormErrorAlert error={editError || null} />
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">
                Group Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-desc">Description</Label>
              <Textarea
                id="edit-desc"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={4}
                placeholder="Optional description"
              />
            </div>
            <SheetFooter className="flex-row justify-end gap-2 px-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving…" : "Save Changes"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Add Member Sheet */}
      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Add Member</SheetTitle>
            <SheetDescription>
              Select a user to add to {group.name}.
            </SheetDescription>
          </SheetHeader>
          <form
            onSubmit={handleAddMember}
            className="flex flex-col gap-4 px-4"
          >
            <FormErrorAlert error={addError || null} />
            <div className="space-y-1.5">
              <Label htmlFor="add-member-user">
                User <span className="text-destructive">*</span>
              </Label>
              {isLoadingUsers ? (
                <p className="text-sm text-muted-foreground">Loading users…</p>
              ) : (
                <Select
                  value={newMemberUserId}
                  onValueChange={setNewMemberUserId}
                >
                  <SelectTrigger id="add-member-user" className="w-full">
                    <SelectValue placeholder="Select a user…" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.map((user) => {
                      const first = user.traits.name?.first || "";
                      const last = user.traits.name?.last || "";
                      const full = `${first} ${last}`.trim();
                      const label = full || user.traits.email || user.id;
                      const sub =
                        full && user.traits.email
                          ? ` (${user.traits.email})`
                          : "";
                      return (
                        <SelectItem key={user.id} value={user.id}>
                          {label}{sub}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            </div>
            <SheetFooter className="flex-row justify-end gap-2 px-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAddOpen(false);
                  setNewMemberUserId("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isAddingMember || !newMemberUserId}
              >
                {isAddingMember ? "Adding…" : "Add Member"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
