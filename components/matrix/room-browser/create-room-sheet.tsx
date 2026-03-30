"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { RoomItem, RoomSpace } from "./types";

interface CreateRoomSheetProps {
  spaces: RoomSpace[];
  defaultSpaceId?: string;
  onCreated: (room: RoomItem) => void;
}

export function CreateRoomSheet({
  spaces,
  defaultSpaceId,
  onCreated,
}: CreateRoomSheetProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [matrixId, setMatrixId] = useState("");
  const [spaceId, setSpaceId] = useState(defaultSpaceId ?? "");
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!name.trim() || !spaceId) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/matrix/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          matrixId: matrixId.trim() || undefined,
          spaceId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to create room");
        return;
      }
      toast.success(`Room "${name.trim()}" created`);
      setName("");
      setDescription("");
      setMatrixId("");
      setSpaceId(defaultSpaceId ?? "");
      setOpen(false);
      onCreated(data.room);
    } finally {
      setCreating(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" className="w-full gap-1.5">
          <Plus className="size-4" />
          Create Room
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>New Room</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4 px-4">
          <div className="space-y-1.5">
            <Label>
              Space <span className="text-destructive">*</span>
            </Label>
            <Select value={spaceId} onValueChange={setSpaceId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a space" />
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
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="general"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Element Room ID</Label>
            <Input
              value={matrixId}
              onChange={(e) => setMatrixId(e.target.value)}
              placeholder="!xyz456:matrix.org"
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
          <Button
            onClick={handleCreate}
            disabled={creating || !name.trim() || !spaceId}
            className="w-full"
          >
            {creating ? "Creating..." : "Create Room"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
