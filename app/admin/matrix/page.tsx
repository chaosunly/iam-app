"use client";

import { useState, useEffect, useCallback } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { LeftPanel } from "@/components/matrix/room-browser/left-panel";
import { RightPanel } from "@/components/matrix/room-browser/right-panel";
import { CreateRoomSheet } from "@/components/matrix/room-browser/create-room-sheet";
import type {
  RoomItem,
  RoomOrg,
  RoomSpace,
  Identity,
  MemberAssignment,
  DmContact,
} from "@/components/matrix/room-browser/types";

export default function MatrixHubPage() {
  const [orgs, setOrgs] = useState<RoomOrg[]>([]);
  const [spaces, setSpaces] = useState<RoomSpace[]>([]);
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [identities, setIdentities] = useState<Identity[]>([]);

  const [activeOrg, setActiveOrg] = useState<RoomOrg | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedDmId, setSelectedDmId] = useState<string | null>(null);
  const [selectedDm, setSelectedDm] = useState<DmContact | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [members, setMembers] = useState<MemberAssignment[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const [error, setError] = useState("");
  const [groupMemberIds, setGroupMemberIds] = useState<Set<string> | null>(null);

  // Controlled CreateRoomSheet for quick-add from space group "+" button
  const [quickRoomSpaceId, setQuickRoomSpaceId] = useState<string | undefined>(
    undefined,
  );
  const [quickRoomOpen, setQuickRoomOpen] = useState(false);

  // ── Initial data fetch ────────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/matrix/orgs").then((r) => r.json()),
      fetch("/api/admin/matrix/spaces").then((r) => r.json()),
      fetch("/api/admin/matrix/rooms").then((r) => r.json()),
      fetch("/api/admin/identities?per_page=250").then((r) => r.json()),
    ])
      .then(([orgsData, spacesData, roomsData, identitiesData]) => {
        const fetchedOrgs: RoomOrg[] = orgsData.orgs ?? [];
        setOrgs(fetchedOrgs);
        setActiveOrg(fetchedOrgs[0] ?? null);
        setSpaces(spacesData.spaces ?? []);
        setRooms(roomsData.rooms ?? []);
        setIdentities(identitiesData.data ?? []);
      })
      .catch(() => setError("Failed to load Matrix data"));
  }, []);

  // ── Fetch members when room selection changes ─────────────────────────────

  const fetchMembers = useCallback(async (roomId: string) => {
    setMembersLoading(true);
    try {
      const res = await fetch(
        `/api/admin/matrix/roles?resourceType=room&resourceId=${roomId}`,
      );
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members ?? []);
      }
    } finally {
      setMembersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedRoomId) {
      fetchMembers(selectedRoomId);
    } else {
      setMembers([]);
    }
  }, [selectedRoomId, fetchMembers]);

  // ── Derived state ─────────────────────────────────────────────────────────

  const visibleRooms = activeOrg
    ? rooms.filter((r) => r.space?.org?.id === activeOrg.id)
    : rooms;

  const visibleSpaces = activeOrg
    ? spaces.filter((s) => s.orgId === activeOrg.id)
    : spaces;

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) ?? null;

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleOrgChange(org: RoomOrg) {
    setActiveOrg(org);
    setSelectedRoomId(null);
    setSearchQuery("");
  }

  function handleOrgCreated(org: RoomOrg) {
    setOrgs((prev) => [...prev, org]);
    setActiveOrg(org);
  }

  function handleSpaceCreated(space: RoomSpace) {
    setSpaces((prev) => [...prev, space]);
  }

  function handleQuickAddRoom(spaceId: string) {
    setQuickRoomSpaceId(spaceId);
    setQuickRoomOpen(true);
  }

  function handleRoomCreated(room: RoomItem) {
    setRooms((prev) => [...prev, room]);
    setSelectedRoomId(room.id);
  }

  function handleRoomDeleted() {
    setRooms((prev) => prev.filter((r) => r.id !== selectedRoomId));
    setSelectedRoomId(null);
  }

  function handleRoomUpdated(updated: RoomItem) {
    setRooms((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  }

  function handleRoomSelect(id: string) {
    setSelectedRoomId(id);
    setSelectedDmId(null);
    setSelectedDm(null);

    const room = rooms.find((r) => r.id === id);
    if (room?.iamGroupId) {
      fetch(`/api/admin/groups/${room.iamGroupId}/members`)
        .then((r) => r.json())
        .then((data) => {
          const ids = (data.members ?? []).map((m: { userId: string }) => m.userId);
          setGroupMemberIds(new Set(ids));
        })
        .catch(() => setGroupMemberIds(null));
    } else {
      setGroupMemberIds(null);
    }
  }

  function handleDmSelect(dm: DmContact) {
    setSelectedDm(dm);
    setSelectedDmId(dm.id);
    setSelectedRoomId(null);
  }

  function handleDmRemoved() {
    setSelectedDm(null);
    setSelectedDmId(null);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        <LeftPanel
          orgs={orgs}
          spaces={visibleSpaces}
          rooms={visibleRooms}
          activeOrg={activeOrg}
          selectedRoomId={selectedRoomId}
          searchQuery={searchQuery}
          memberCount={members.length > 0 ? members.length : undefined}
          identities={identities}
          selectedDmId={selectedDmId}
          onOrgChange={handleOrgChange}
          onOrgCreated={handleOrgCreated}
          onRoomSelect={handleRoomSelect}
          onSearchChange={setSearchQuery}
          onRoomCreated={handleRoomCreated}
          onSpaceCreated={handleSpaceCreated}
          onQuickAddRoom={handleQuickAddRoom}
          onDmSelect={handleDmSelect}
        />
        <RightPanel
          room={selectedRoom}
          members={members}
          identities={groupMemberIds ? identities.filter((i) => groupMemberIds.has(i.id)) : identities}
          membersLoading={membersLoading}
          onMembersRefresh={() => selectedRoomId && fetchMembers(selectedRoomId)}
          onRoomDeleted={handleRoomDeleted}
          onRoomUpdated={handleRoomUpdated}
          selectedDm={selectedDm}
          onDmRemoved={handleDmRemoved}
        />
      </div>
      <CreateRoomSheet
        spaces={visibleSpaces}
        defaultSpaceId={quickRoomSpaceId}
        open={quickRoomOpen}
        onOpenChange={setQuickRoomOpen}
        onCreated={handleRoomCreated}
      />
    </>
  );
}
