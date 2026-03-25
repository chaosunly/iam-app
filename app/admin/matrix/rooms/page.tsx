"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { AlertCircle, Hash } from "lucide-react";

interface MatrixSpace {
  id: string;
  name: string;
  org?: { id: string; name: string } | null;
}

interface MatrixRoom {
  id: string;
  name: string;
  description?: string | null;
  matrixId?: string | null;
  spaceId: string;
  createdAt: string;
  space?: MatrixSpace | null;
}

export default function MatrixRoomsPage() {
  const searchParams = useSearchParams();
  const [spaceFilter, setSpaceFilter] = useState(searchParams.get("spaceId") || "");
  const [spaces, setSpaces] = useState<MatrixSpace[]>([]);
  const [rooms, setRooms] = useState<MatrixRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newMatrixId, setNewMatrixId] = useState("");
  const [newSpaceId, setNewSpaceId] = useState(searchParams.get("spaceId") || "");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    fetchSpaces();
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [spaceFilter]);

  async function fetchSpaces() {
    try {
      const res = await fetch("/api/admin/matrix/spaces");
      if (res.ok) {
        const data = await res.json();
        setSpaces(data.spaces || []);
      }
    } catch {
      // non-blocking
    }
  }

  async function fetchRooms() {
    try {
      setLoading(true);
      const url = spaceFilter
        ? `/api/admin/matrix/rooms?spaceId=${spaceFilter}`
        : "/api/admin/matrix/rooms";
      const res = await fetch(url);
      if (res.status === 403) {
        setError("You do not have permission to view Matrix rooms.");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch rooms");
      const data = await res.json();
      setRooms(data.rooms || []);
    } catch (err: any) {
      setError(err.message || "Failed to load rooms");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    setCreating(true);

    try {
      const res = await fetch("/api/admin/matrix/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription.trim() || undefined,
          matrixId: newMatrixId.trim() || undefined,
          spaceId: newSpaceId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create room");
      }

      setShowCreate(false);
      setNewName("");
      setNewDescription("");
      setNewMatrixId("");
      fetchRooms();
    } catch (err: any) {
      setCreateError(err.message || "Failed to create room");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(roomId: string, roomName: string) {
    if (!confirm(`Delete room "${roomName}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/admin/matrix/rooms/${roomId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete room");
      }
      fetchRooms();
    } catch (err: any) {
      alert(err.message || "Failed to delete room");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading rooms...
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Matrix Rooms</h1>
          <p className="text-muted-foreground mt-1">
            Manage individual Matrix rooms within spaces
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>Create Room</Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filter by space */}
      <div className="flex items-center gap-3">
        <Label>Filter by space:</Label>
        <Select
          value={spaceFilter || "__all__"}
          onValueChange={(v) => setSpaceFilter(v === "__all__" ? "" : v)}
        >
          <SelectTrigger className="w-60">
            <SelectValue placeholder="All spaces" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All spaces</SelectItem>
            {spaces.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.org ? `${s.org.name} / ` : ""}
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Inline create panel */}
      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle>New Room</CardTitle>
          </CardHeader>
          <CardContent>
            {createError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{createError}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>
                  Space <span className="text-destructive">*</span>
                </Label>
                <Select value={newSpaceId} onValueChange={setNewSpaceId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select space" />
                  </SelectTrigger>
                  <SelectContent>
                    {spaces.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.org ? `${s.org.name} / ` : ""}
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  placeholder="general"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Element Room ID</Label>
                <Input
                  value={newMatrixId}
                  onChange={(e) => setNewMatrixId(e.target.value)}
                  placeholder="!xyz456:matrix.org"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="col-span-2 flex gap-3">
                <Button type="submit" disabled={creating}>
                  {creating ? "Creating..." : "Create Room"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="p-0 gap-0">
        {rooms.length > 0 ? (
          <div className="divide-y">
            {rooms.map((room) => (
              <div key={room.id} className="p-5 hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-base font-semibold"># {room.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {room.space && (
                        <Badge variant="secondary">
                          {room.space.org?.name ? `${room.space.org.name} / ` : ""}
                          {room.space.name}
                        </Badge>
                      )}
                      {room.matrixId && (
                        <span className="text-xs text-muted-foreground font-mono">
                          {room.matrixId}
                        </span>
                      )}
                    </div>
                    {room.description && (
                      <p className="text-sm text-muted-foreground mt-1">{room.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Created {new Date(room.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/admin/matrix/roles?resourceType=room&resourceId=${room.id}`}>
                        Roles
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(room.id, room.name)}
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
            <Hash className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No rooms yet</h3>
            <p className="mt-2 text-muted-foreground text-sm">
              {spaceFilter ? "No rooms in the selected space." : "Create a room to get started."}
            </p>
            <Button className="mt-6" onClick={() => setShowCreate(true)}>
              Create Room
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
