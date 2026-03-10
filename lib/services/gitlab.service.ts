/**
 * GitLab Service - Manages GitLab groups, projects, and role assignments
 * Integrates with Ory Keto for permission management
 */

import {
  grantPermission,
  revokePermission,
  checkPermission,
} from "./keto.service";
import { prisma } from "@/lib/db";
import { BadRequestError, NotFoundError, ConflictError } from "@/lib/errors";
import {
  GitlabRole,
  GitlabResourceType,
  isValidGitlabRole,
  isValidResourceType,
} from "@/lib/keto/namespaces";

// ============================================================
// Types
// ============================================================

export interface GitlabGroup {
  id: string;
  name: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GitlabProject {
  id: string;
  name: string;
  description?: string | null;
  groupId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  group?: GitlabGroup | null;
}

export interface GitlabRoleAssignment {
  id: string;
  userId: string;
  resourceType: GitlabResourceType;
  resourceId: string;
  role: GitlabRole;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    email?: string;
    name?: string;
  };
}

export interface CreateGitlabGroupInput {
  name: string;
  description?: string;
}

export interface CreateGitlabProjectInput {
  name: string;
  description?: string;
  groupId?: string;
}

export interface AssignRoleInput {
  userId: string;
  resourceType: GitlabResourceType;
  resourceId: string;
  role: GitlabRole;
}

export interface UpdateRoleInput {
  userId: string;
  resourceType: GitlabResourceType;
  resourceId: string;
  newRole: GitlabRole;
}

export interface RemoveRoleInput {
  userId: string;
  resourceType: GitlabResourceType;
  resourceId: string;
}

// ============================================================
// GitLab Groups
// ============================================================

/**
 * Create a new GitLab group
 */
export async function createGitlabGroup(
  input: CreateGitlabGroupInput,
): Promise<GitlabGroup> {
  // Validate input
  if (!input.name || input.name.trim().length === 0) {
    throw new BadRequestError("Group name is required");
  }

  // Check if group already exists
  const existing = await prisma.gitlabGroup.findUnique({
    where: { name: input.name },
  });

  if (existing) {
    throw new ConflictError(`Group '${input.name}' already exists`);
  }

  // Create group in database
  const group = await prisma.gitlabGroup.create({
    data: {
      name: input.name,
      description: input.description,
    },
  });

  return group;
}

/**
 * Get all GitLab groups
 */
export async function getGitlabGroups(): Promise<GitlabGroup[]> {
  return await prisma.gitlabGroup.findMany({
    orderBy: { name: "asc" },
  });
}

/**
 * Get GitLab group by ID
 */
export async function getGitlabGroupById(
  id: string,
): Promise<GitlabGroup | null> {
  return await prisma.gitlabGroup.findUnique({
    where: { id },
  });
}

/**
 * Get group with members
 */
export async function getGitlabGroupWithMembers(groupId: string) {
  const group = await prisma.gitlabGroup.findUnique({
    where: { id: groupId },
  });

  if (!group) {
    throw new NotFoundError(`Group '${groupId}' not found`);
  }

  const members = await getResourceMembers("group", groupId);

  return {
    ...group,
    members,
  };
}

/**
 * Delete GitLab group
 */
export async function deleteGitlabGroup(id: string): Promise<void> {
  const group = await prisma.gitlabGroup.findUnique({
    where: { id },
    include: { projects: true },
  });

  if (!group) {
    throw new NotFoundError(`Group '${id}' not found`);
  }

  // Check if group has projects
  if (group.projects.length > 0) {
    throw new BadRequestError(
      `Cannot delete group with ${group.projects.length} projects. Delete projects first.`,
    );
  }

  // Delete role assignments from database
  await prisma.gitlabRoleAssignment.deleteMany({
    where: {
      resourceType: "group",
      resourceId: id,
    },
  });

  // Revoke all Keto permissions for this group
  const assignments = await prisma.gitlabRoleAssignment.findMany({
    where: {
      resourceType: "group",
      resourceId: id,
    },
  });

  for (const assignment of assignments) {
    await revokePermission({
      namespace: "GitlabGroup",
      object: id,
      relation: assignment.role,
      subject: assignment.userId,
    });
  }

  // Delete group
  await prisma.gitlabGroup.delete({
    where: { id },
  });
}

// ============================================================
// GitLab Projects
// ============================================================

/**
 * Create a new GitLab project
 */
export async function createGitlabProject(
  input: CreateGitlabProjectInput,
): Promise<GitlabProject> {
  // Validate input
  if (!input.name || input.name.trim().length === 0) {
    throw new BadRequestError("Project name is required");
  }

  // If groupId provided, verify group exists
  if (input.groupId) {
    const group = await prisma.gitlabGroup.findUnique({
      where: { id: input.groupId },
    });

    if (!group) {
      throw new NotFoundError(`Group '${input.groupId}' not found`);
    }
  }

  // Check if project already exists
  const existing = await prisma.gitlabProject.findUnique({
    where: { name: input.name },
  });

  if (existing) {
    throw new ConflictError(`Project '${input.name}' already exists`);
  }

  // Create project in database
  const project = await prisma.gitlabProject.create({
    data: {
      name: input.name,
      description: input.description,
      groupId: input.groupId,
    },
    include: {
      group: true,
    },
  });

  // If project is linked to a group, create parent relationship in Keto
  if (input.groupId) {
    await grantPermission({
      namespace: "GitlabProject",
      object: project.id,
      relation: "parent",
      subject: `GitlabGroup:${input.groupId}`,
    });
  }

  return project;
}

/**
 * Get all GitLab projects
 */
export async function getGitlabProjects(): Promise<GitlabProject[]> {
  return await prisma.gitlabProject.findMany({
    include: {
      group: true,
    },
    orderBy: { name: "asc" },
  });
}

/**
 * Get GitLab project by ID
 */
export async function getGitlabProjectById(
  id: string,
): Promise<GitlabProject | null> {
  return await prisma.gitlabProject.findUnique({
    where: { id },
    include: {
      group: true,
    },
  });
}

/**
 * Get project with members
 */
export async function getGitlabProjectWithMembers(projectId: string) {
  const project = await prisma.gitlabProject.findUnique({
    where: { id: projectId },
    include: { group: true },
  });

  if (!project) {
    throw new NotFoundError(`Project '${projectId}' not found`);
  }

  const members = await getResourceMembers("project", projectId);

  return {
    ...project,
    members,
  };
}

/**
 * Delete GitLab project
 */
export async function deleteGitlabProject(id: string): Promise<void> {
  const project = await prisma.gitlabProject.findUnique({
    where: { id },
  });

  if (!project) {
    throw new NotFoundError(`Project '${id}' not found`);
  }

  // Delete role assignments from database
  await prisma.gitlabRoleAssignment.deleteMany({
    where: {
      resourceType: "project",
      resourceId: id,
    },
  });

  // Revoke all Keto permissions for this project
  const assignments = await prisma.gitlabRoleAssignment.findMany({
    where: {
      resourceType: "project",
      resourceId: id,
    },
  });

  for (const assignment of assignments) {
    await revokePermission({
      namespace: "GitlabProject",
      object: id,
      relation: assignment.role,
      subject: assignment.userId,
    });
  }

  // Revoke parent relationship if exists
  if (project.groupId) {
    await revokePermission({
      namespace: "GitlabProject",
      object: id,
      relation: "parent",
      subject: `GitlabGroup:${project.groupId}`,
    });
  }

  // Delete project
  await prisma.gitlabProject.delete({
    where: { id },
  });
}

// ============================================================
// Role Assignments
// ============================================================

/**
 * Assign a role to a user
 */
export async function assignGitlabRole(
  input: AssignRoleInput,
): Promise<GitlabRoleAssignment> {
  // Validate inputs
  if (!isValidResourceType(input.resourceType)) {
    throw new BadRequestError(`Invalid resource type: ${input.resourceType}`);
  }

  if (!isValidGitlabRole(input.role)) {
    throw new BadRequestError(`Invalid role: ${input.role}`);
  }

  // Verify resource exists
  if (input.resourceType === "group") {
    const group = await prisma.gitlabGroup.findUnique({
      where: { id: input.resourceId },
    });
    if (!group) {
      throw new NotFoundError(`Group '${input.resourceId}' not found`);
    }
  } else if (input.resourceType === "project") {
    const project = await prisma.gitlabProject.findUnique({
      where: { id: input.resourceId },
    });
    if (!project) {
      throw new NotFoundError(`Project '${input.resourceId}' not found`);
    }
  }

  // Check if assignment already exists
  const existing = await prisma.gitlabRoleAssignment.findFirst({
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

  // Create role assignment in database
  const assignment = await prisma.gitlabRoleAssignment.create({
    data: {
      userId: input.userId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      role: input.role,
    },
  });

  // Grant permission in Keto
  const namespace =
    input.resourceType === "group" ? "GitlabGroup" : "GitlabProject";
  await grantPermission({
    namespace,
    object: input.resourceId,
    relation: input.role,
    subject: input.userId,
  });

  return assignment as GitlabRoleAssignment;
}

/**
 * Update a user's role
 */
export async function updateGitlabRole(
  input: UpdateRoleInput,
): Promise<GitlabRoleAssignment> {
  // Validate inputs
  if (!isValidResourceType(input.resourceType)) {
    throw new BadRequestError(`Invalid resource type: ${input.resourceType}`);
  }

  if (!isValidGitlabRole(input.newRole)) {
    throw new BadRequestError(`Invalid role: ${input.newRole}`);
  }

  // Find existing assignment
  const existing = await prisma.gitlabRoleAssignment.findFirst({
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

  // Update in database
  const updated = await prisma.gitlabRoleAssignment.update({
    where: { id: existing.id },
    data: { role: input.newRole },
  });

  // Update in Keto: revoke old role, grant new role
  const namespace =
    input.resourceType === "group" ? "GitlabGroup" : "GitlabProject";

  await revokePermission({
    namespace,
    object: input.resourceId,
    relation: oldRole,
    subject: input.userId,
  });

  await grantPermission({
    namespace,
    object: input.resourceId,
    relation: input.newRole,
    subject: input.userId,
  });

  return updated as GitlabRoleAssignment;
}

/**
 * Remove a user's role
 */
export async function removeGitlabRole(input: RemoveRoleInput): Promise<void> {
  // Validate inputs
  if (!isValidResourceType(input.resourceType)) {
    throw new BadRequestError(`Invalid resource type: ${input.resourceType}`);
  }

  // Find existing assignment
  const existing = await prisma.gitlabRoleAssignment.findFirst({
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

  // Delete from database
  await prisma.gitlabRoleAssignment.delete({
    where: { id: existing.id },
  });

  // Revoke permission in Keto
  const namespace =
    input.resourceType === "group" ? "GitlabGroup" : "GitlabProject";
  await revokePermission({
    namespace,
    object: input.resourceId,
    relation: existing.role,
    subject: input.userId,
  });
}

/**
 * Get all members of a resource (group or project)
 */
export async function getResourceMembers(
  resourceType: GitlabResourceType,
  resourceId: string,
): Promise<GitlabRoleAssignment[]> {
  const assignments = await prisma.gitlabRoleAssignment.findMany({
    where: {
      resourceType,
      resourceId,
    },
    orderBy: { createdAt: "desc" },
  });

  return assignments as GitlabRoleAssignment[];
}

/**
 * Get all role assignments for a user
 */
export async function getUserGitlabRoles(
  userId: string,
): Promise<GitlabRoleAssignment[]> {
  const assignments = await prisma.gitlabRoleAssignment.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return assignments as GitlabRoleAssignment[];
}

/**
 * Check if user has specific permission on resource
 */
export async function checkGitlabPermission(
  userId: string,
  resourceType: GitlabResourceType,
  resourceId: string,
  permission: string,
): Promise<boolean> {
  const namespace = resourceType === "group" ? "GitlabGroup" : "GitlabProject";

  return await checkPermission({
    namespace,
    object: resourceId,
    relation: permission,
    subject: userId,
  });
}
