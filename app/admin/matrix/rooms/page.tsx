"use client";

import { useState, useEffect, useCallback } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { LeftPanel } from "@/components/matrix/room-browser/left-panel";
import { RightPanel } from "@/components/matrix/room-browser/right-panel";
import type {
  RoomItem,
  RoomOrg,
  RoomSpace,
  Identity,
  MemberAssignment,
} from "@/components/matrix/room-browser/types";

export default function MatrixRoomsPage() {
  const [orgs, setOrgs] = useState<RoomOrg[]>([]);
  const [spaces, setSpaces] = useState<RoomSpace[]>([]);
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [identities, setIdentities] = useState<Identity[]>([]);

  const [activeOrg, setActiveOrg] = useState<RoomOrg | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [members, setMembers] = useState<MemberAssignment[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const [error, setError] = useState("");

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

  // Filter rooms to those belonging to the active org (client-side)
  const visibleRooms = activeOrg
    ? rooms.filter((r) => r.space?.org?.id === activeOrg.id)
    : rooms;

  // Filter spaces for CreateRoomSheet to those belonging to active org
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

  function handleRoomCreated(room: RoomItem) {
    setRooms((prev) => [...prev, room]);
    setSelectedRoomId(room.id);
  }

  function handleRoomDeleted() {
    setRooms((prev) => prev.filter((r) => r.id !== selectedRoomId));
    setSelectedRoomId(null);
  }

  function handleRoomUpdated(updated: RoomItem) {
    setRooms((prev) =>
      prev.map((r) => (r.id === updated.id ? updated : r)),
    );
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
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      <LeftPanel
        orgs={orgs}
        spaces={visibleSpaces}
        rooms={visibleRooms}
        activeOrg={activeOrg}
        selectedRoomId={selectedRoomId}
        searchQuery={searchQuery}
        memberCount={members.length > 0 ? members.length : undefined}
        onOrgChange={handleOrgChange}
        onRoomSelect={setSelectedRoomId}
        onSearchChange={setSearchQuery}
        onRoomCreated={handleRoomCreated}
      />
      <RightPanel
        room={selectedRoom}
        members={members}
        identities={identities}
        membersLoading={membersLoading}
        onMembersRefresh={() => selectedRoomId && fetchMembers(selectedRoomId)}
        onRoomDeleted={handleRoomDeleted}
        onRoomUpdated={handleRoomUpdated}
      />
    </div>
  );
}
