"use client";

import { useState } from "react";
import { Layers } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { RoomSpace } from "./types";

interface CreateSpaceSheetProps {
  orgId: string;
  orgName: string;
  onCreated: (space: RoomSpace) => void;
}

export function CreateSpaceSheet({
  orgId,
  orgName,
  onCreated,
}: CreateSpaceSheetProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [matrixId, setMatrixId] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!name.trim() || !orgId) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/matrix/spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          orgId,
          matrixId: matrixId.trim() || undefined,
          description: description.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to create space");
        return;
      }
      toast.success(`Space "${name.trim()}" created`);
      setName("");
      setMatrixId("");
      setDescription("");
      setOpen(false);
      onCreated(data.space);
    } finally {
      setCreating(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="w-full gap-1.5 border-dashed"
          disabled={!orgId}
        >
          <Layers className="size-4" />
          New Space
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>New Space</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4 px-4">
          <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
            Creating space in <strong>{orgName}</strong>
          </div>
          <div className="space-y-1.5">
            <Label>
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="General"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Matrix Space ID</Label>
            <Input
              value={matrixId}
              onChange={(e) => setMatrixId(e.target.value)}
              placeholder="!abc:matrix.org"
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
            disabled={creating || !name.trim()}
            className="w-full"
          >
            {creating ? "Creating..." : "Create Space"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
