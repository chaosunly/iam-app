export interface RoomOrg {
  id: string;
  name: string;
}

export interface RoomSpace {
  id: string;
  name: string;
  orgId: string;
  org?: RoomOrg | null;
}

export interface RoomItem {
  id: string;
  name: string;
  description?: string | null;
  matrixId?: string | null;
  spaceId: string;
  iamGroupId?: string | null;
  createdAt: string;
  space?: RoomSpace | null;
}

export interface Identity {
  id: string;
  traits: { email?: string; name?: string };
}

export type MatrixResourceType = "org" | "space" | "room";

export interface MemberAssignment {
  id: string;
  userId: string;
  resourceType: MatrixResourceType;
  resourceId: string;
  role: string;
  createdAt: string;
}

export interface DmContact {
  id: string;
  recipientId: string;
  matrixRoomId?: string | null;
  matrixUserId?: string | null;
}
