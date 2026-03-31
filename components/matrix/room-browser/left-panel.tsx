"use client";

import { Lock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrgSwitcher } from "./org-switcher";
import { RoomListItem } from "./room-list-item";
import { CreateRoomSheet } from "./create-room-sheet";
import { CreateSpaceSheet } from "./create-space-sheet";
import type { RoomItem, RoomOrg, RoomSpace } from "./types";

interface LeftPanelProps {
  orgs: RoomOrg[];
  spaces: RoomSpace[];
  rooms: RoomItem[];
  activeOrg: RoomOrg | null;
  selectedRoomId: string | null;
  searchQuery: string;
  memberCount: number | undefined;
  onOrgChange: (org: RoomOrg) => void;
  onOrgCreated: (org: RoomOrg) => void;
  onRoomSelect: (id: string) => void;
  onSearchChange: (q: string) => void;
  onRoomCreated: (room: RoomItem) => void;
  onSpaceCreated: (space: RoomSpace) => void;
  onQuickAddRoom: (spaceId: string) => void;
}

export function LeftPanel({
  orgs,
  spaces,
  rooms,
  activeOrg,
  selectedRoomId,
  searchQuery,
  memberCount,
  onOrgChange,
  onOrgCreated,
  onRoomSelect,
  onSearchChange,
  onRoomCreated,
  onSpaceCreated,
  onQuickAddRoom,
}: LeftPanelProps) {
  const filtered = searchQuery
    ? rooms.filter((r) =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : rooms;

  const groupedRooms = filtered.reduce<Record<string, RoomItem[]>>(
    (acc, room) => {
      const spaceName = room.space?.name ?? "Unknown Space";
      if (!acc[spaceName]) acc[spaceName] = [];
      acc[spaceName].push(room);
      return acc;
    },
    {},
  );

  return (
    <div className="flex w-64 shrink-0 flex-col border-r">
      {/* Org Switcher */}
      <div className="p-3">
        <OrgSwitcher
          orgs={orgs}
          activeOrg={activeOrg}
          onOrgChange={onOrgChange}
          onOrgCreated={onOrgCreated}
        />
      </div>

      <Separator />

      {/* Filter Tabs */}
      <Tabs defaultValue="all" className="flex flex-1 flex-col overflow-hidden">
        <div className="px-3 pt-2">
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1">
              All
            </TabsTrigger>
            <TabsTrigger value="rooms" className="flex-1">
              Rooms
            </TabsTrigger>
            <TabsTrigger value="people" className="flex-1">
              People
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Search */}
        <div className="px-3 py-2">
          <Input
            placeholder="Search rooms..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-8 text-sm"
          />
        </div>

        <TabsContent value="all" className="flex-1 overflow-hidden mt-0">
          <RoomList
            groupedRooms={groupedRooms}
            selectedRoomId={selectedRoomId}
            memberCount={memberCount}
            onRoomSelect={onRoomSelect}
            showDmPlaceholder
            onQuickAddRoom={onQuickAddRoom}
          />
        </TabsContent>

        <TabsContent value="rooms" className="flex-1 overflow-hidden mt-0">
          <RoomList
            groupedRooms={groupedRooms}
            selectedRoomId={selectedRoomId}
            memberCount={memberCount}
            onRoomSelect={onRoomSelect}
            showDmPlaceholder={false}
            onQuickAddRoom={onQuickAddRoom}
          />
        </TabsContent>

        <TabsContent value="people" className="flex-1 overflow-hidden mt-0">
          <ScrollArea className="h-full">
            <DmPlaceholder />
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Footer: New Space + Create Room */}
      <div className="border-t p-3 flex flex-col gap-2">
        {activeOrg ? (
          <CreateSpaceSheet
            orgId={activeOrg.id}
            orgName={activeOrg.name}
            onCreated={onSpaceCreated}
          />
        ) : (
          <Button
            size="sm"
            variant="outline"
            disabled
            className="w-full gap-1.5 border-dashed"
          >
            <Plus className="size-4" />
            New Space
          </Button>
        )}
        <CreateRoomSheet spaces={spaces} onCreated={onRoomCreated} />
      </div>
    </div>
  );
}

// ─── Room List ────────────────────────────────────────────────────────────────

interface RoomListProps {
  groupedRooms: Record<string, RoomItem[]>;
  selectedRoomId: string | null;
  memberCount: number | undefined;
  onRoomSelect: (id: string) => void;
  showDmPlaceholder: boolean;
  onQuickAddRoom: (spaceId: string) => void;
}

function RoomList({
  groupedRooms,
  selectedRoomId,
  memberCount,
  onRoomSelect,
  showDmPlaceholder,
  onQuickAddRoom,
}: RoomListProps) {
  const spaceNames = Object.keys(groupedRooms).sort();

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-2">
        {spaceNames.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">
            No rooms found
          </p>
        )}
        {spaceNames.map((spaceName) => (
          <div key={spaceName}>
            <div className="flex items-center justify-between px-2 py-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {spaceName}
              </p>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4"
                onClick={() =>
                  onQuickAddRoom(groupedRooms[spaceName][0].spaceId)
                }
                title="Add room to this space"
              >
                <Plus className="size-3" />
              </Button>
            </div>
            {groupedRooms[spaceName].map((room) => (
              <RoomListItem
                key={room.id}
                room={room}
                isSelected={room.id === selectedRoomId}
                memberCount={
                  room.id === selectedRoomId ? memberCount : undefined
                }
                onClick={() => onRoomSelect(room.id)}
              />
            ))}
          </div>
        ))}
        {showDmPlaceholder && <DmPlaceholder />}
      </div>
    </ScrollArea>
  );
}

// ─── DM Placeholder ───────────────────────────────────────────────────────────

function DmPlaceholder() {
  return (
    <div className="mt-2 px-2">
      <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Direct Messages
      </p>
      <div className="flex items-center gap-2 rounded-md border border-dashed px-3 py-2.5 text-muted-foreground">
        <Lock className="size-4 shrink-0" />
        <div>
          <p className="text-xs font-medium">Coming soon</p>
          <p className="text-xs opacity-70">
            Direct Message rooms will appear here
          </p>
        </div>
      </div>
    </div>
  );
}
