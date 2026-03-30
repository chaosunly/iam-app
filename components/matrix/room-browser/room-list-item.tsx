"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { RoomItem } from "./types";

interface RoomListItemProps {
  room: RoomItem;
  isSelected: boolean;
  memberCount?: number;
  onClick: () => void;
}

export function RoomListItem({
  room,
  isSelected,
  memberCount,
  onClick,
}: RoomListItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors text-left",
        isSelected
          ? "bg-accent text-accent-foreground border-l-2 border-primary pl-[6px]"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
      )}
    >
      <span className="shrink-0 text-muted-foreground">#</span>
      <span className="flex-1 truncate">{room.name}</span>
      {isSelected && memberCount !== undefined && (
        <Badge variant="secondary" className="h-4 px-1.5 py-0 text-xs">
          {memberCount}
        </Badge>
      )}
    </button>
  );
}
