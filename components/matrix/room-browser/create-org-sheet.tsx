"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { RoomOrg } from "./types";

interface CreateOrgSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (org: RoomOrg) => void;
}

export function CreateOrgSheet({
  open,
  onOpenChange,
  onCreated,
}: CreateOrgSheetProps) {
  const [name, setName] = useState("");
  const [homeserver, setHomeserver] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/matrix/orgs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          homeserver: homeserver.trim() || undefined,
          description: description.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to create org");
        return;
      }
      toast.success(`Org "${name.trim()}" created`);
      setName("");
      setHomeserver("");
      setDescription("");
      onOpenChange(false);
      onCreated(data.org);
    } finally {
      setCreating(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>New Org</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4 px-4">
          <div className="space-y-1.5">
            <Label>
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Corp"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Homeserver</Label>
            <Input
              value={homeserver}
              onChange={(e) => setHomeserver(e.target.value)}
              placeholder="https://matrix.org"
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
            {creating ? "Creating..." : "Create Org"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
