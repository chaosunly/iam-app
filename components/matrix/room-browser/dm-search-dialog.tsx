"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { DmContact, Identity } from "./types";

interface DmSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  identities: Identity[];
  existingDms: DmContact[];
  onAdded: (dm: DmContact) => void;
}

export function DmSearchDialog({
  open,
  onOpenChange,
  identities,
  existingDms,
  onAdded,
}: DmSearchDialogProps) {
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState<string | null>(null);

  const existingIds = new Set(existingDms.map((d) => d.recipientId));

  const suggestions = useMemo(() => {
    const q = query.toLowerCase();
    return identities
      .filter((i) => !existingIds.has(i.id))
      .filter((i) => {
        if (!q) return true;
        const email = i.traits.email?.toLowerCase() ?? "";
        const name = i.traits.name?.toLowerCase() ?? "";
        return email.includes(q) || name.includes(q);
      })
      .slice(0, 8);
  }, [identities, existingIds, query]);

  async function handleAdd(identity: Identity) {
    setAdding(identity.id);
    try {
      const res = await fetch("/api/admin/matrix/dms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: identity.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to add DM contact");
        return;
      }
      onAdded(data.dm);
      onOpenChange(false);
      setQuery("");
    } finally {
      setAdding(null);
    }
  }

  function identityLabel(identity: Identity): string {
    return identity.traits.name || identity.traits.email || identity.id;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Direct Messages</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Start a conversation using their name or email. No room is created
          until you message in Element.
        </p>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search by name or email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
        {suggestions.length > 0 ? (
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">
              {query ? "Results" : "Suggestions"}
            </p>
            {suggestions.map((identity) => {
              const label = identityLabel(identity);
              const initial = label[0]?.toUpperCase() ?? "?";
              return (
                <button
                  key={identity.id}
                  onClick={() => handleAdd(identity)}
                  disabled={adding === identity.id}
                  className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-accent transition-colors disabled:opacity-50"
                >
                  <Avatar className="size-7">
                    <AvatarFallback className="text-xs">{initial}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">
                      {identity.traits.email}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {query ? "No users found" : "No more users to add"}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
