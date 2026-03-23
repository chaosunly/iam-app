/**
 * Matrix Service - Manages Matrix orgs, spaces, rooms, and role assignments
 * Integrates with Ory Keto for permission management (dual-persist pattern)
 */

import { grantPermission, revokePermission, checkPermission } from "./keto.service";
import { prisma } from "@/lib/db";
import { BadRequestError, NotFoundError, ConflictError } from "@/lib/errors";
import {
  MatrixRole,
  MatrixResourceType,
  isValidMatrixRole,
  isValidMatrixResourceType,
  MATRIX_NAMESPACE_MAP,
} from "@/lib/keto/namespaces";

// ============================================================
// Types
// ============================================================

export interface MatrixOrg {
  id: string;
  name: string;
  description?: string | null;
  homeserver?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MatrixSpace {
  id: string;
  name: string;
  description?: string | null;
  matrixId?: string | null;
  orgId: string;
  createdAt: Date;
  updatedAt: Date;
  org?: MatrixOrg | null;
}

export interface MatrixRoom {
  id: string;
  name: string;
  description?: string | null;
  matrixId?: string | null;
  spaceId: string;
  createdAt: Date;
  updatedAt: Date;
  space?: MatrixSpace | null;
}

export interface MatrixRoleAssignment {
  id: string;
  userId: string;
  resourceType: MatrixResourceType;
  resourceId: string;
  role: MatrixRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMatrixOrgInput {
  name: string;
  description?: string;
  homeserver?: string;
}

export interface CreateMatrixSpaceInput {
  name: string;
  description?: string;
  matrixId?: string;
  orgId: string;
}

export interface CreateMatrixRoomInput {
  name: string;
  description?: string;
  matrixId?: string;
  spaceId: string;
}

export interface AssignMatrixRoleInput {
  userId: string;
  resourceType: MatrixResourceType;
  resourceId: string;
  role: MatrixRole;
}

export interface UpdateMatrixRoleInput {
  userId: string;
  resourceType: MatrixResourceType;
  resourceId: string;
  newRole: MatrixRole;
}

export interface RemoveMatrixRoleInput {
  userId: string;
  resourceType: MatrixResourceType;
  resourceId: string;
}

// ============================================================
// Matrix Orgs
// ============================================================

export async function createMatrixOrg(input: CreateMatrixOrgInput): Promise<MatrixOrg> {
  if (!input.name || input.name.trim().length === 0) {
    throw new BadRequestError("Org name is required");
  }

  const existing = await prisma.matrixOrg.findUnique({ where: { name: input.name } });
  if (existing) {
    throw new ConflictError(`Matrix org '${input.name}' already exists`);
  }

  return prisma.matrixOrg.create({
    data: {
      name: input.name,
      description: input.description,
      homeserver: input.homeserver,
    },
  });
}

export async function getMatrixOrgs(): Promise<MatrixOrg[]> {
  return prisma.matrixOrg.findMany({ orderBy: { name: "asc" } });
}

export async function getMatrixOrgById(id: string): Promise<MatrixOrg | null> {
  return prisma.matrixOrg.findUnique({ where: { id } });
}

export async function deleteMatrixOrg(id: string): Promise<void> {
  const org = await prisma.matrixOrg.findUnique({
    where: { id },
    include: { spaces: true },
  });

  if (!org) throw new NotFoundError(`Matrix org '${id}' not found`);

  if (org.spaces.length > 0) {
    throw new BadRequestError(
      `Cannot delete org with ${org.spaces.length} space(s). Delete spaces first.`,
    );
  }

  // Revoke all Keto permissions for this org
  const assignments = await prisma.matrixRoleAssignment.findMany({
    where: { resourceType: "org", resourceId: id },
  });
  for (const a of assignments) {
    await revokePermission({
      namespace: "MatrixOrg",
      object: id,
      relation: a.role,
      subject: a.userId,
    });
  }

  await prisma.matrixRoleAssignment.deleteMany({
    where: { resourceType: "org", resourceId: id },
  });

  await prisma.matrixOrg.delete({ where: { id } });
}

// ============================================================
// Matrix Spaces
// ============================================================

export async function createMatrixSpace(input: CreateMatrixSpaceInput): Promise<MatrixSpace> {
  if (!input.name || input.name.trim().length === 0) {
    throw new BadRequestError("Space name is required");
  }

  const org = await prisma.matrixOrg.findUnique({ where: { id: input.orgId } });
  if (!org) throw new NotFoundError(`Matrix org '${input.orgId}' not found`);

  const existing = await prisma.matrixSpace.findFirst({
    where: { orgId: input.orgId, name: input.name },
  });
  if (existing) {
    throw new ConflictError(`Space '${input.name}' already exists in this org`);
  }

  const space = await prisma.matrixSpace.create({
    data: {
      name: input.name,
      description: input.description,
      matrixId: input.matrixId,
      orgId: input.orgId,
    },
    include: { org: true },
  });

  // Create parent inheritance tuple in Keto
  await grantPermission({
    namespace: "MatrixSpace",
    object: space.id,
    relation: "parent",
    subject: `MatrixOrg:${input.orgId}`,
  });

  return space;
}

export async function getMatrixSpaces(orgId?: string): Promise<MatrixSpace[]> {
  return prisma.matrixSpace.findMany({
    where: orgId ? { orgId } : undefined,
    include: { org: true },
    orderBy: { name: "asc" },
  });
}

export async function getMatrixSpaceById(id: string): Promise<MatrixSpace | null> {
  return prisma.matrixSpace.findUnique({
    where: { id },
    include: { org: true },
  });
}

export async function deleteMatrixSpace(id: string): Promise<void> {
  const space = await prisma.matrixSpace.findUnique({
    where: { id },
    include: { rooms: true },
  });

  if (!space) throw new NotFoundError(`Matrix space '${id}' not found`);

  if (space.rooms.length > 0) {
    throw new BadRequestError(
      `Cannot delete space with ${space.rooms.length} room(s). Delete rooms first.`,
    );
  }

  // Revoke Keto permissions
  const assignments = await prisma.matrixRoleAssignment.findMany({
    where: { resourceType: "space", resourceId: id },
  });
  for (const a of assignments) {
    await revokePermission({
      namespace: "MatrixSpace",
      object: id,
      relation: a.role,
      subject: a.userId,
    });
  }

  // Revoke parent relation
  await revokePermission({
    namespace: "MatrixSpace",
    object: id,
    relation: "parent",
    subject: `MatrixOrg:${space.orgId}`,
  });

  await prisma.matrixRoleAssignment.deleteMany({
    where: { resourceType: "space", resourceId: id },
  });

  await prisma.matrixSpace.delete({ where: { id } });
}

// ============================================================
// Matrix Rooms
// ============================================================

export async function createMatrixRoom(input: CreateMatrixRoomInput): Promise<MatrixRoom> {
  if (!input.name || input.name.trim().length === 0) {
    throw new BadRequestError("Room name is required");
  }

  const space = await prisma.matrixSpace.findUnique({ where: { id: input.spaceId } });
  if (!space) throw new NotFoundError(`Matrix space '${input.spaceId}' not found`);

  const existing = await prisma.matrixRoom.findFirst({
    where: { spaceId: input.spaceId, name: input.name },
  });
  if (existing) {
    throw new ConflictError(`Room '${input.name}' already exists in this space`);
  }

  const room = await prisma.matrixRoom.create({
    data: {
      name: input.name,
      description: input.description,
      matrixId: input.matrixId,
      spaceId: input.spaceId,
    },
    include: { space: { include: { org: true } } },
  });

  // Create parent inheritance tuple in Keto
  await grantPermission({
    namespace: "MatrixRoom",
    object: room.id,
    relation: "parent",
    subject: `MatrixSpace:${input.spaceId}`,
  });

  return room;
}

export async function getMatrixRooms(spaceId?: string): Promise<MatrixRoom[]> {
  return prisma.matrixRoom.findMany({
    where: spaceId ? { spaceId } : undefined,
    include: { space: { include: { org: true } } },
    orderBy: { name: "asc" },
  });
}

export async function getMatrixRoomById(id: string): Promise<MatrixRoom | null> {
  return prisma.matrixRoom.findUnique({
    where: { id },
    include: { space: { include: { org: true } } },
  });
}

export async function deleteMatrixRoom(id: string): Promise<void> {
  const room = await prisma.matrixRoom.findUnique({ where: { id } });
  if (!room) throw new NotFoundError(`Matrix room '${id}' not found`);

  // Revoke Keto permissions
  const assignments = await prisma.matrixRoleAssignment.findMany({
    where: { resourceType: "room", resourceId: id },
  });
  for (const a of assignments) {
    await revokePermission({
      namespace: "MatrixRoom",
      object: id,
      relation: a.role,
      subject: a.userId,
    });
  }

  // Revoke parent relation
  await revokePermission({
    namespace: "MatrixRoom",
    object: id,
    relation: "parent",
    subject: `MatrixSpace:${room.spaceId}`,
  });

  await prisma.matrixRoleAssignment.deleteMany({
    where: { resourceType: "room", resourceId: id },
  });

  await prisma.matrixRoom.delete({ where: { id } });
}

// ============================================================
// Role Assignments
// ============================================================

export async function assignMatrixRole(
  input: AssignMatrixRoleInput,
): Promise<MatrixRoleAssignment> {
  if (!isValidMatrixResourceType(input.resourceType)) {
    throw new BadRequestError(`Invalid resource type: '${input.resourceType}'`);
  }
  if (!isValidMatrixRole(input.role)) {
    throw new BadRequestError(`Invalid Matrix role: '${input.role}'`);
  }

  // Verify resource exists
  await assertResourceExists(input.resourceType, input.resourceId);

  // Check for existing assignment
  const existing = await prisma.matrixRoleAssignment.findFirst({
    where: {
      userId: input.userId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
    },
  });
  if (existing) {
    throw new ConflictError(
      `User already has role '${existing.role}' on this ${input.resourceType}`,
    );
  }

  const assignment = await prisma.matrixRoleAssignment.create({
    data: {
      userId: input.userId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      role: input.role,
    },
  });

  // Grant permission in Keto
  await grantPermission({
    namespace: MATRIX_NAMESPACE_MAP[input.resourceType],
    object: input.resourceId,
    relation: input.role,
    subject: input.userId,
  });

  return assignment as MatrixRoleAssignment;
}

export async function updateMatrixRole(
  input: UpdateMatrixRoleInput,
): Promise<MatrixRoleAssignment> {
  if (!isValidMatrixResourceType(input.resourceType)) {
    throw new BadRequestError(`Invalid resource type: '${input.resourceType}'`);
  }
  if (!isValidMatrixRole(input.newRole)) {
    throw new BadRequestError(`Invalid Matrix role: '${input.newRole}'`);
  }

  const existing = await prisma.matrixRoleAssignment.findFirst({
    where: {
      userId: input.userId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
    },
  });
  if (!existing) {
    throw new NotFoundError(
      `No role assignment found for user on this ${input.resourceType}`,
    );
  }

  const oldRole = existing.role;
  const updated = await prisma.matrixRoleAssignment.update({
    where: { id: existing.id },
    data: { role: input.newRole },
  });

  const namespace = MATRIX_NAMESPACE_MAP[input.resourceType];
  await revokePermission({ namespace, object: input.resourceId, relation: oldRole, subject: input.userId });
  await grantPermission({ namespace, object: input.resourceId, relation: input.newRole, subject: input.userId });

  return updated as MatrixRoleAssignment;
}

export async function removeMatrixRole(input: RemoveMatrixRoleInput): Promise<void> {
  if (!isValidMatrixResourceType(input.resourceType)) {
    throw new BadRequestError(`Invalid resource type: '${input.resourceType}'`);
  }

  const existing = await prisma.matrixRoleAssignment.findFirst({
    where: {
      userId: input.userId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
    },
  });
  if (!existing) {
    throw new NotFoundError(
      `No role assignment found for user on this ${input.resourceType}`,
    );
  }

  await prisma.matrixRoleAssignment.delete({ where: { id: existing.id } });

  await revokePermission({
    namespace: MATRIX_NAMESPACE_MAP[input.resourceType],
    object: input.resourceId,
    relation: existing.role,
    subject: input.userId,
  });
}

export async function getMatrixResourceMembers(
  resourceType: MatrixResourceType,
  resourceId: string,
): Promise<MatrixRoleAssignment[]> {
  const assignments = await prisma.matrixRoleAssignment.findMany({
    where: { resourceType, resourceId },
    orderBy: { createdAt: "desc" },
  });
  return assignments as MatrixRoleAssignment[];
}

export async function getUserMatrixRoles(userId: string): Promise<MatrixRoleAssignment[]> {
  const assignments = await prisma.matrixRoleAssignment.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return assignments as MatrixRoleAssignment[];
}

export async function checkMatrixPermission(
  userId: string,
  resourceType: MatrixResourceType,
  resourceId: string,
  permission: string,
): Promise<boolean> {
  return checkPermission({
    namespace: MATRIX_NAMESPACE_MAP[resourceType],
    object: resourceId,
    relation: permission,
    subject: userId,
  });
}

// ============================================================
// Helpers
// ============================================================

async function assertResourceExists(
  resourceType: MatrixResourceType,
  resourceId: string,
): Promise<void> {
  if (resourceType === "org") {
    const org = await prisma.matrixOrg.findUnique({ where: { id: resourceId } });
    if (!org) throw new NotFoundError(`Matrix org '${resourceId}' not found`);
  } else if (resourceType === "space") {
    const space = await prisma.matrixSpace.findUnique({ where: { id: resourceId } });
    if (!space) throw new NotFoundError(`Matrix space '${resourceId}' not found`);
  } else {
    const room = await prisma.matrixRoom.findUnique({ where: { id: resourceId } });
    if (!room) throw new NotFoundError(`Matrix room '${resourceId}' not found`);
  }
}
