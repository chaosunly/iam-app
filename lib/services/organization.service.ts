/**
 * Organization Service - Manages organization members and roles
 * Handles member invitations, role assignments, and permission checks
 */

import { prisma } from "@/lib/db";
import {
  checkPermission,
  grantPermission,
  revokePermission,
  listObjectPermissions,
} from "./keto.service";
import { getIdentity } from "./kratos.service";
import { backgroundBootstrapMatrixOrg } from "./matrix-provision.service";

export interface OrganizationMember {
  userId: string;
  email: string;
  name: string;
  role: "owner" | "admin" | "member";
  joinedAt?: Date;
}

export interface Organization {
  id: string;
  name: string;
  description?: string;
  createdAt?: Date;
}

/**
 * Create a new organization
 */
export async function createOrganization(
  orgData: { name: string; description?: string },
  creatorId: string,
): Promise<Organization> {
  const orgId = `org_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  // Store org metadata in database
  const org = await prisma.organization.create({
    data: {
      id: orgId,
      name: orgData.name,
      description: orgData.description,
    },
  });

  // Make creator the owner in Keto
  await grantPermission({
    namespace: "Organization",
    object: orgId,
    relation: "owners",
    subject: creatorId,
  });

  backgroundBootstrapMatrixOrg(org.id, org.name);

  return {
    id: org.id,
    name: org.name,
    description: org.description || undefined,
    createdAt: org.createdAt,
  };
}

/**
 * Add a member to an organization
 */
export async function addOrganizationMember(
  organizationId: string,
  userId: string,
  role: "owner" | "admin" | "member",
  inviterId: string,
): Promise<void> {
  // Check if inviter has permission
  const canInvite = await checkPermission({
    namespace: "Organization",
    object: organizationId,
    relation: "invite_member",
    subject: inviterId,
  });

  if (!canInvite) {
    throw new Error("Insufficient permissions to invite members");
  }

  // Add user to organization with specified role
  await grantPermission({
    namespace: "Organization",
    object: organizationId,
    relation: role + "s", // "owners", "admins", or "members"
    subject: userId,
  });
}

/**
 * Remove a member from an organization
 */
export async function removeOrganizationMember(
  organizationId: string,
  userId: string,
  removerId: string,
): Promise<void> {
  // Check if remover has permission
  const canRemove = await checkPermission({
    namespace: "Organization",
    object: organizationId,
    relation: "remove_member",
    subject: removerId,
  });

  if (!canRemove) {
    throw new Error("Insufficient permissions to remove members");
  }

  // Remove all role relationships
  const roles = ["owners", "admins", "members"];
  for (const role of roles) {
    try {
      await revokePermission({
        namespace: "Organization",
        object: organizationId,
        relation: role,
        subject: userId,
      });
    } catch {
      // Ignore if relationship doesn't exist
    }
  }
}

/**
 * Update member role in organization
 */
export async function updateMemberRole(
  organizationId: string,
  userId: string,
  newRole: "owner" | "admin" | "member",
  updaterId: string,
): Promise<void> {
  // Check permission
  const canManage = await checkPermission({
    namespace: "Organization",
    object: organizationId,
    relation: "manage_users",
    subject: updaterId,
  });

  if (!canManage) {
    throw new Error("Insufficient permissions to update member roles");
  }

  // Remove old roles
  const roles = ["owners", "admins", "members"];
  for (const role of roles) {
    try {
      await revokePermission({
        namespace: "Organization",
        object: organizationId,
        relation: role,
        subject: userId,
      });
    } catch {
      // Ignore if relationship doesn't exist
    }
  }

  // Add new role
  await grantPermission({
    namespace: "Organization",
    object: organizationId,
    relation: newRole + "s",
    subject: userId,
  });
}

/**
 * Get all members of an organization
 */
export async function getOrganizationMembers(
  organizationId: string,
): Promise<OrganizationMember[]> {
  const members: OrganizationMember[] = [];
  const roles = [
    { relation: "owners", role: "owner" as const },
    { relation: "admins", role: "admin" as const },
    { relation: "members", role: "member" as const },
  ];

  // Fetch all relationships once, then partition by relation
  const allRelationships = await listObjectPermissions(
    "Organization",
    organizationId,
  );

  for (const { relation, role } of roles) {
    const roleMembers = allRelationships.filter(
      (rel) => rel.relation === relation,
    );

    for (const rel of roleMembers) {
      let email = "";
      let name = "";
      try {
        const identity = await getIdentity(rel.subject);
        email = identity.traits.email || "";
        const first = identity.traits.name?.first || "";
        const last = identity.traits.name?.last || "";
        name = `${first} ${last}`.trim() || email;
      } catch {
        // identity not found — leave blank
      }
      members.push({
        userId: rel.subject,
        email,
        name,
        role,
      });
    }
  }

  return members;
}

/**
 * Get user's role in organization
 */
export async function getUserRole(
  organizationId: string,
  userId: string,
): Promise<"owner" | "admin" | "member" | null> {
  const roles = ["owners", "admins", "members"] as const;

  for (const relation of roles) {
    const isMember = await checkPermission({
      namespace: "Organization",
      object: organizationId,
      relation,
      subject: userId,
    });

    if (isMember) {
      // Remove 's' from end to get role name
      return relation.slice(0, -1) as "owner" | "admin" | "member";
    }
  }

  return null;
}

/**
 * Check if user is a member of organization
 */
export async function isOrganizationMember(
  organizationId: string,
  userId: string,
): Promise<boolean> {
  return await checkPermission({
    namespace: "Organization",
    object: organizationId,
    relation: "is_member",
    subject: userId,
  });
}

/**
 * Check if user can manage organization
 */
export async function canManageOrganization(
  userId: string,
  organizationId: string,
): Promise<boolean> {
  return await checkPermission({
    namespace: "Organization",
    object: organizationId,
    relation: "manage_org",
    subject: userId,
  });
}

/**
 * Check if user can manage users in organization
 */
export async function canManageUsers(
  userId: string,
  organizationId: string,
): Promise<boolean> {
  return await checkPermission({
    namespace: "Organization",
    object: organizationId,
    relation: "manage_users",
    subject: userId,
  });
}

/**
 * Check if user can manage groups in organization
 */
export async function canManageGroups(
  userId: string,
  organizationId: string,
): Promise<boolean> {
  return await checkPermission({
    namespace: "Organization",
    object: organizationId,
    relation: "manage_groups",
    subject: userId,
  });
}

/**
 * Check if user can manage roles in organization
 */
export async function canManageRoles(
  userId: string,
  organizationId: string,
): Promise<boolean> {
  return await checkPermission({
    namespace: "Organization",
    object: organizationId,
    relation: "manage_roles",
    subject: userId,
  });
}

/**
 * Get the default organization ID for the system
 * In a real implementation, this would be user-specific or stored in DB
 */
export function getDefaultOrganizationId(): string {
  return process.env.DEFAULT_ORG_ID || "default-org";
}
