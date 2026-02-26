/**
 * Group Service - Manages groups within organizations
 * Handles group creation, member management, and permission checks
 */

import {
  checkPermission,
  grantPermission,
  revokePermission,
  listObjectPermissions,
} from "./keto.service";

export interface Group {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  memberCount?: number;
  createdAt?: Date;
}

export interface GroupMember {
  userId: string;
  email?: string;
  name?: string;
  joinedAt?: Date;
}

/**
 * Create a new group in an organization
 */
export async function createGroup(
  organizationId: string,
  groupData: { name: string; description?: string },
  creatorId: string,
): Promise<Group> {
  // Check if creator has permission to create groups
  const canCreateGroup = await checkPermission({
    namespace: "Organization",
    object: organizationId,
    relation: "create_group",
    subject: creatorId,
  });

  if (!canCreateGroup) {
    throw new Error("Insufficient permissions to create groups");
  }

  const groupId = `group_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  // Create relationship: Group belongs to Organization
  await grantPermission({
    namespace: "Group",
    object: groupId,
    relation: "org",
    subject: organizationId,
  });

  // Store group metadata (name, description) in a database
  // For now, return the structure - you'll need to implement DB storage
  return {
    id: groupId,
    name: groupData.name,
    description: groupData.description,
    organizationId,
    memberCount: 0,
    createdAt: new Date(),
  };
}

/**
 * Add a user to a group
 */
export async function addUserToGroup(
  groupId: string,
  userId: string,
  adminId: string,
): Promise<void> {
  // Check if admin has permission to add members to this group
  const canManage = await checkPermission({
    namespace: "Group",
    object: groupId,
    relation: "add_member",
    subject: adminId,
  });

  if (!canManage) {
    throw new Error("Insufficient permissions to add members to this group");
  }

  // Add user as member of group
  await grantPermission({
    namespace: "Group",
    object: groupId,
    relation: "members",
    subject: userId,
  });
}

/**
 * Remove a user from a group
 */
export async function removeUserFromGroup(
  groupId: string,
  userId: string,
  adminId: string,
): Promise<void> {
  // Check if admin has permission to remove members from this group
  const canManage = await checkPermission({
    namespace: "Group",
    object: groupId,
    relation: "remove_member",
    subject: adminId,
  });

  if (!canManage) {
    throw new Error(
      "Insufficient permissions to remove members from this group",
    );
  }

  // Remove user from group
  await revokePermission({
    namespace: "Group",
    object: groupId,
    relation: "members",
    subject: userId,
  });
}

/**
 * Get all groups in an organization
 */
export async function getOrganizationGroups(
  organizationId: string,
): Promise<Group[]> {
  try {
    const relationships = await listObjectPermissions(
      "Organization",
      organizationId,
    );

    // Filter for groups that belong to this organization
    const groupRelations = relationships.filter(
      (rel) => rel.namespace === "Group" && rel.relation === "org",
    );

    // For now, return basic info - you'll need to fetch metadata from DB
    const groups: Group[] = [];

    for (const rel of groupRelations) {
      const groupId = rel.object;
      const members = await getGroupMembers(groupId);

      groups.push({
        id: groupId,
        name: groupId, // Replace with DB lookup
        description: "", // Replace with DB lookup
        organizationId,
        memberCount: members.length,
      });
    }

    return groups;
  } catch (error) {
    console.error("Error fetching organization groups:", error);
    return [];
  }
}

/**
 * Get all members of a group
 */
export async function getGroupMembers(groupId: string): Promise<string[]> {
  try {
    const relationships = await listObjectPermissions("Group", groupId);

    // Filter for member relationships
    const members = relationships
      .filter((rel) => rel.relation === "members")
      .map((rel) => rel.subject);

    return members;
  } catch (error) {
    console.error("Error fetching group members:", error);
    return [];
  }
}

/**
 * Get all groups a user belongs to
 */
export async function getUserGroups(
  userId: string,
  organizationId?: string,
): Promise<Group[]> {
  try {
    // Get all Group relationships where user is a member
    const params = new URLSearchParams({
      namespace: "Group",
      relation: "members",
      "subject_id.id": userId,
    });

    const KETO_READ_URL =
      process.env.ORY_KETO_READ_URL || "http://localhost:4466";
    const url = `${KETO_READ_URL}/relation-tuples?${params}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("Failed to fetch user groups");
      return [];
    }

    const data = await response.json();
    const groupIds = (data.relation_tuples || []).map(
      (rt: { object: string }) => rt.object,
    );

    // Build group objects (fetch metadata from DB in real implementation)
    const groups: Group[] = [];
    for (const groupId of groupIds) {
      const members = await getGroupMembers(groupId);
      groups.push({
        id: groupId,
        name: groupId, // Replace with DB lookup
        organizationId: organizationId || "",
        memberCount: members.length,
      });
    }

    return groups;
  } catch (error) {
    console.error("Error fetching user groups:", error);
    return [];
  }
}

/**
 * Check if user can manage a group
 */
export async function canManageGroup(
  userId: string,
  groupId: string,
): Promise<boolean> {
  return await checkPermission({
    namespace: "Group",
    object: groupId,
    relation: "manage",
    subject: userId,
  });
}

/**
 * Check if user is a member of a group
 */
export async function isGroupMember(
  userId: string,
  groupId: string,
): Promise<boolean> {
  return await checkPermission({
    namespace: "Group",
    object: groupId,
    relation: "is_member",
    subject: userId,
  });
}

/**
 * Delete a group
 */
export async function deleteGroup(
  groupId: string,
  adminId: string,
): Promise<void> {
  // Check permission
  const canManage = await canManageGroup(adminId, groupId);
  if (!canManage) {
    throw new Error("Insufficient permissions to delete this group");
  }

  // Get all relationships for this group and delete them
  const relationships = await listObjectPermissions("Group", groupId);

  for (const rel of relationships) {
    await revokePermission({
      namespace: rel.namespace,
      object: rel.object,
      relation: rel.relation,
      subject: rel.subject,
    });
  }

  // Delete group metadata from database (implement DB deletion)
}

/**
 * Assign a role to a group
 */
export async function assignRoleToGroup(
  groupId: string,
  roleId: string,
  adminId: string,
): Promise<void> {
  // Check if admin can manage the group
  const canManage = await canManageGroup(adminId, groupId);
  if (!canManage) {
    throw new Error("Insufficient permissions to assign roles to this group");
  }

  // Create relationship: Role includes Group
  await grantPermission({
    namespace: "Role",
    object: roleId,
    relation: "groups",
    subject: groupId,
  });
}

/**
 * Remove a role from a group
 */
export async function removeRoleFromGroup(
  groupId: string,
  roleId: string,
  adminId: string,
): Promise<void> {
  // Check if admin can manage the group
  const canManage = await canManageGroup(adminId, groupId);
  if (!canManage) {
    throw new Error("Insufficient permissions to remove roles from this group");
  }

  // Remove relationship
  await revokePermission({
    namespace: "Role",
    object: roleId,
    relation: "groups",
    subject: groupId,
  });
}
