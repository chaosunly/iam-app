"use client";

import { useState, useEffect } from "react";
import { Hash } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AssignRoleForm } from "./assign-role-form";
import { RoleSelectCell } from "./role-select-cell";
import type { RoomItem, Identity, MemberAssignment, DmContact } from "./types";

interface RightPanelProps {
  room: RoomItem | null;
  members: MemberAssignment[];
  identities: Identity[];
  membersLoading: boolean;
  onMembersRefresh: () => void;
  onRoomDeleted: () => void;
  onRoomUpdated: (room: RoomItem) => void;
  selectedDm: DmContact | null;
  onDmRemoved: () => void;
}

export function RightPanel({
  room,
  members,
  identities,
  membersLoading,
  onMembersRefresh,
  onRoomDeleted,
  onRoomUpdated,
  selectedDm,
  onDmRemoved,
}: RightPanelProps) {
  if (selectedDm) {
    return (
      <DmContactPanel
        dm={selectedDm}
        identities={identities}
        onRemoved={onDmRemoved}
      />
    );
  }

  if (!room) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Hash className="mx-auto mb-3 h-10 w-10 opacity-30" />
          <p className="text-sm">Select a room to manage its members</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <RoomHeader
        room={room}
        onDeleted={onRoomDeleted}
        onUpdated={onRoomUpdated}
      />
      <Tabs defaultValue="members" className="flex flex-1 flex-col overflow-hidden">
        <div className="border-b px-6">
          <TabsList variant="line" className="h-10 rounded-none bg-transparent p-0">
            <TabsTrigger value="members" className="rounded-none">
              Members {members.length > 0 && `(${members.length})`}
            </TabsTrigger>
            <TabsTrigger value="settings" className="rounded-none">
              Settings
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="members"
          className="flex flex-1 flex-col overflow-hidden mt-0"
        >
          <div className="border-b px-6 py-3">
            <AssignRoleForm
              roomId={room.id}
              identities={identities}
              onAssigned={onMembersRefresh}
            />
          </div>
          <div className="flex-1 overflow-auto">
            <MembersTable
              members={members}
              identities={identities}
              loading={membersLoading}
              onRefresh={onMembersRefresh}
            />
          </div>
        </TabsContent>

        <TabsContent value="settings" className="overflow-auto mt-0 px-6 py-4">
          <RoomSettings room={room} onUpdated={onRoomUpdated} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Room Header ─────────────────────────────────────────────────────────────

interface RoomHeaderProps {
  room: RoomItem;
  onDeleted: () => void;
  onUpdated: (room: RoomItem) => void;
}

function RoomHeader({ room, onDeleted, onUpdated }: RoomHeaderProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState(room.name);
  const [description, setDescription] = useState(room.description ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Sync local edit state when room prop changes (e.g. after save from settings tab)
  useEffect(() => {
    if (!saving) {
      setName(room.name);
      setDescription(room.description ?? "");
    }
  }, [room.id, room.name, room.description]);

  async function handleSaveEdit() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/matrix/rooms/${room.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update room");
        return;
      }
      onUpdated(data.room);
      setEditOpen(false);
      toast.success("Room updated");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/matrix/rooms/${room.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to delete room");
        return;
      }
      toast.success(`Room "${room.name}" deleted`);
      onDeleted();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex items-center justify-between border-b px-6 py-4">
      <div>
        <div className="flex items-center gap-2">
          <Hash className="size-5 text-muted-foreground" />
          <h2 className="text-xl font-semibold">{room.name}</h2>
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          {room.space?.org && <span>{room.space.org.name}</span>}
          {room.space?.org && <span>›</span>}
          {room.space && <span>{room.space.name}</span>}
          {room.matrixId && (
            <code className="rounded bg-muted px-1 py-0.5 font-mono">
              {room.matrixId}
            </code>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Sheet open={editOpen} onOpenChange={setEditOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm">
              Edit
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Edit Room</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-4 px-4">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="general"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Matrix ID</Label>
                <code className="block rounded bg-muted px-3 py-2 text-sm font-mono text-muted-foreground">
                  {room.matrixId || "—"}
                </code>
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Space</Label>
                <div>
                  {room.space ? (
                    <Badge variant="secondary">{room.space.name}</Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </div>
              </div>
              <Button
                onClick={handleSaveEdit}
                disabled={saving || !name.trim()}
                className="w-full"
              >
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete room &quot;{room.name}&quot;?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes the room and all its role assignments. This cannot
                be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

// ─── Members Table ────────────────────────────────────────────────────────────

interface MembersTableProps {
  members: MemberAssignment[];
  identities: Identity[];
  loading: boolean;
  onRefresh: () => void;
}

function identityLabel(identities: Identity[], userId: string): string {
  const identity = identities.find((i) => i.id === userId);
  return identity?.traits?.email || identity?.traits?.name || userId;
}

function MembersTable({
  members,
  identities,
  loading,
  onRefresh,
}: MembersTableProps) {
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleRemove(member: MemberAssignment) {
    setRemovingId(member.id);
    try {
      const res = await fetch("/api/admin/matrix/roles", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: member.userId,
          resourceType: member.resourceType,
          resourceId: member.resourceId,
          role: member.role,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to remove role");
        return;
      }
      toast.success("Role removed");
      onRefresh();
    } finally {
      setRemovingId(null);
    }
  }

  if (loading) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Loading members...
      </p>
    );
  }

  if (members.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No role assignments yet for this room.
      </p>
    );
  }

  return (
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
        {members.map((member) => {
          const label = identityLabel(identities, member.userId);
          const initial = label[0]?.toUpperCase() ?? "?";
          return (
            <TableRow key={member.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar className="size-7">
                    <AvatarFallback className="text-xs">{initial}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {member.userId}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <RoleSelectCell
                  userId={member.userId}
                  resourceType={member.resourceType}
                  resourceId={member.resourceId}
                  role={member.role}
                  onRefresh={onRefresh}
                />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(member.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={removingId === member.id}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      Remove
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove role?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Remove {member.role} from {label} on this room.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleRemove(member)}>
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

// ─── Room Settings ────────────────────────────────────────────────────────────

interface RoomSettingsProps {
  room: RoomItem;
  onUpdated: (room: RoomItem) => void;
}

function RoomSettings({ room, onUpdated }: RoomSettingsProps) {
  const [name, setName] = useState(room.name);
  const [description, setDescription] = useState(room.description ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/matrix/rooms/${room.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update room");
        return;
      }
      onUpdated(data.room);
      toast.success("Room updated");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-sm space-y-4">
      <div className="space-y-1.5">
        <Label>Name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Description</Label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-muted-foreground">Matrix ID</Label>
        <code className="block rounded bg-muted px-3 py-2 text-sm font-mono text-muted-foreground">
          {room.matrixId || "—"}
        </code>
      </div>
      <div className="space-y-1.5">
        <Label className="text-muted-foreground">Space</Label>
        <div>
          {room.space ? (
            <Badge variant="secondary">{room.space.name}</Badge>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </div>
      </div>
      <Button onClick={handleSave} disabled={saving || !name.trim()}>
        {saving ? "Saving..." : "Save changes"}
      </Button>
    </div>
  );
}

// ─── DM Contact Panel ─────────────────────────────────────────────────────────

interface DmContactPanelProps {
  dm: DmContact;
  identities: Identity[];
  onRemoved: () => void;
}

function DmContactPanel({ dm, identities, onRemoved }: DmContactPanelProps) {
  const [removing, setRemoving] = useState(false);

  const identity = identities.find((i) => i.id === dm.recipientId);
  const label =
    identity?.traits?.name || identity?.traits?.email || dm.recipientId;
  const initial = label[0]?.toUpperCase() ?? "?";

  const elementUrl = dm.matrixUserId
    ? `https://matrix.to/#/${encodeURIComponent(dm.matrixUserId)}`
    : null;

  async function handleRemove() {
    setRemoving(true);
    try {
      const res = await fetch(`/api/admin/matrix/dms/${dm.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to remove contact");
        return;
      }
      toast.success("DM contact removed");
      onRemoved();
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b px-6 py-4">
        <Avatar className="size-10">
          <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-xl font-semibold">{label}</h2>
          <p className="text-xs text-muted-foreground">Direct Message</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="max-w-sm space-y-4">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground">Email</Label>
            <p className="text-sm">{identity?.traits?.email ?? "—"}</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-muted-foreground">Matrix ID</Label>
            {dm.matrixUserId ? (
              <code className="block rounded bg-muted px-3 py-2 text-sm font-mono text-muted-foreground">
                {dm.matrixUserId}
              </code>
            ) : (
              <p className="text-sm text-muted-foreground">Not provisioned</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-muted-foreground">Room</Label>
            {dm.matrixRoomId ? (
              <code className="block rounded bg-muted px-3 py-2 text-sm font-mono text-muted-foreground">
                {dm.matrixRoomId}
              </code>
            ) : (
              <p className="text-sm italic text-muted-foreground">
                Not created yet
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            {elementUrl && (
              <Button size="sm" asChild>
                <a href={elementUrl} target="_blank" rel="noopener noreferrer">
                  Open in Element ↗
                </a>
              </Button>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                >
                  Remove
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove DM contact?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes {label} from your DM list. It does not delete
                    any Matrix room in Element.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRemove} disabled={removing}>
                    {removing ? "Removing…" : "Remove"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </div>
  );
}
