"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, ChevronLeft } from "lucide-react";

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
    name?: {
      first?: string;
      last?: string;
    };
  };
}

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [admins, setAdmins] = useState<GroupMember[]>([]);
  const [allUsers, setAllUsers] = useState<Identity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [error, setError] = useState("");
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberUserId, setNewMemberUserId] = useState("");
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdminUserId, setNewAdminUserId] = useState("");
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);

  // Dialog state
  const [removeMemberDialog, setRemoveMemberDialog] = useState<string | null>(
    null,
  );
  const [revokeAdminDialog, setRevokeAdminDialog] = useState<string | null>(
    null,
  );
  const [deleteGroupDialog, setDeleteGroupDialog] = useState(false);

  useEffect(() => {
    loadGroupData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  useEffect(() => {
    if (showAddMember && allUsers.length === 0) {
      loadAllUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAddMember]);

  const loadGroupData = async () => {
    try {
      setIsLoading(true);
      const [groupRes, membersRes, adminsRes] = await Promise.all([
        fetch(`/api/admin/groups/${groupId}`),
        fetch(`/api/admin/groups/${groupId}/members`),
        fetch(`/api/admin/groups/${groupId}/admins`),
      ]);

      if (!groupRes.ok) throw new Error("Failed to load group");
      if (!membersRes.ok) throw new Error("Failed to load members");

      const groupData = await groupRes.json();
      const membersData = await membersRes.json();

      setGroup(groupData);
      setMembers(membersData.members || []);

      if (adminsRes.ok) {
        const adminsData = await adminsRes.json();
        setAdmins(adminsData.admins || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load group");
    } finally {
      setIsLoading(false);
    }
  };

  const loadAllUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const response = await fetch("/api/admin/identities");

      if (!response.ok) throw new Error("Failed to load users");

      const result = await response.json();
      // API returns { data: [...], status: 200 }
      const users = Array.isArray(result.data) ? result.data : [];
      setAllUsers(users);
    } catch (err) {
      console.error("Failed to load users:", err);
      setError(err instanceof Error ? err.message : "Failed to load users");
      setAllUsers([]); // Ensure it's always an array
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Get available users (not already members)
  const availableUsers = allUsers.filter(
    (user) => !members.some((member) => member.userId === user.id),
  );

  // Get users that can be made admin (members not already admins)
  const availableAdminCandidates = allUsers.filter(
    (user) => !admins.some((admin) => admin.userId === user.id),
  );

  const getUserDisplayName = (user: Identity) => {
    const firstName = user.traits.name?.first || "";
    const lastName = user.traits.name?.last || "";
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || user.traits.email || user.id;
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingMember(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/groups/${groupId}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: newMemberUserId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add member");
      }

      setNewMemberUserId("");
      setShowAddMember(false);
      await loadGroupData();
      // Reload users to update available list
      await loadAllUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add member");
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      const response = await fetch(
        `/api/admin/groups/${groupId}/members/${userId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to remove member");
      }

      await loadGroupData();
      // Reload users to update available list
      if (allUsers.length > 0) {
        await loadAllUsers();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    }
  };

  const handleDeleteGroup = async () => {
    try {
      const response = await fetch(`/api/admin/groups/${groupId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete group");
      }

      router.push("/admin/groups");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete group");
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingAdmin(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/groups/${groupId}/admins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: newAdminUserId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to grant admin");
      }

      setNewAdminUserId("");
      setShowAddAdmin(false);
      await loadGroupData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to grant admin");
    } finally {
      setIsAddingAdmin(false);
    }
  };

  const handleRevokeAdmin = async (targetUserId: string) => {
    try {
      const response = await fetch(`/api/admin/groups/${groupId}/admins`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: targetUserId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to revoke admin");
      }

      await loadGroupData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke admin");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <div className="text-zinc-600 dark:text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <div className="text-red-600 dark:text-red-400">Group not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div>
        <Link
          href="/admin/groups"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Groups
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">{group.name}</h1>
            {group.description && (
              <p className="text-muted-foreground mt-1">{group.description}</p>
            )}
          </div>
          <Button
            variant="destructive"
            onClick={() => setDeleteGroupDialog(true)}
          >
            Delete Group
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Members Section */}
      <div className="rounded-lg border overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center bg-muted/30">
          <h2 className="text-lg font-semibold">Members ({members.length})</h2>
          <Button size="sm" onClick={() => setShowAddMember(!showAddMember)}>
            Add Member
          </Button>
        </div>

        {showAddMember && (
          <div className="p-4 border-b bg-muted/10">
            <form onSubmit={handleAddMember} className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">
                  Select User
                </label>
                {isLoadingUsers ? (
                  <p className="text-sm text-muted-foreground">
                    Loading users...
                  </p>
                ) : availableUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    All users are already members.
                  </p>
                ) : (
                  <select
                    value={newMemberUserId}
                    onChange={(e) => setNewMemberUserId(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">-- Select a user --</option>
                    {availableUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {getUserDisplayName(user)}
                        {user.traits.email && ` (${user.traits.email})`}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddMember(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isAddingMember ||
                  !newMemberUserId ||
                  availableUsers.length === 0
                }
              >
                {isAddingMember ? "Adding..." : "Add Member"}
              </Button>
            </form>
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>User ID</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground py-10"
                >
                  No members in this group yet.
                </TableCell>
              </TableRow>
            ) : (
              members.map((member) => (
                <TableRow key={member.userId}>
                  <TableCell className="font-medium">
                    {member.name || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {member.email || "—"}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-mono text-muted-foreground">
                      {member.userId.substring(0, 16)}...
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setRemoveMemberDialog(member.userId)}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Group Admins Section */}
      <div className="rounded-lg border overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center bg-muted/30">
          <div>
            <h2 className="text-lg font-semibold">
              Group Admins ({admins.length})
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Admins can manage members of this group.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setShowAddAdmin(!showAddAdmin);
              if (!showAddAdmin && allUsers.length === 0) loadAllUsers();
            }}
          >
            Add Admin
          </Button>
        </div>

        {showAddAdmin && (
          <div className="p-4 border-b bg-muted/10">
            <form onSubmit={handleAddAdmin} className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">
                  Select User
                </label>
                {isLoadingUsers ? (
                  <p className="text-sm text-muted-foreground">
                    Loading users...
                  </p>
                ) : availableAdminCandidates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No users available to promote.
                  </p>
                ) : (
                  <select
                    value={newAdminUserId}
                    onChange={(e) => setNewAdminUserId(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">-- Select a user --</option>
                    {availableAdminCandidates.map((user) => (
                      <option key={user.id} value={user.id}>
                        {getUserDisplayName(user)}
                        {user.traits.email && ` (${user.traits.email})`}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddAdmin(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isAddingAdmin || !newAdminUserId}>
                {isAddingAdmin ? "Granting..." : "Grant Admin"}
              </Button>
            </form>
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>User ID</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {admins.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground py-10"
                >
                  No group admins assigned yet.
                </TableCell>
              </TableRow>
            ) : (
              admins.map((admin) => (
                <TableRow key={admin.userId}>
                  <TableCell className="font-medium">
                    {admin.name || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {admin.email || "—"}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-mono text-muted-foreground">
                      {admin.userId.substring(0, 16)}...
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setRevokeAdminDialog(admin.userId)}
                    >
                      Revoke
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {/* Remove Member Dialog */}
      <AlertDialog
        open={!!removeMemberDialog}
        onOpenChange={(open) => !open && setRemoveMemberDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this member from the group?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (removeMemberDialog) handleRemoveMember(removeMemberDialog);
                setRemoveMemberDialog(null);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke Admin Dialog */}
      <AlertDialog
        open={!!revokeAdminDialog}
        onOpenChange={(open) => !open && setRevokeAdminDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Admin Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the admin role from this user?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (revokeAdminDialog) handleRevokeAdmin(revokeAdminDialog);
                setRevokeAdminDialog(null);
              }}
            >
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Group Dialog */}
      <AlertDialog open={deleteGroupDialog} onOpenChange={setDeleteGroupDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this group? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setDeleteGroupDialog(false);
                handleDeleteGroup();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
