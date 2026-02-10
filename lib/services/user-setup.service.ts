/**
 * User Setup Service
 * Handles initial setup for new users including:
 * - Default organization assignment
 * - Default permissions
 * - User role assignment
 */

import {
  addUserToOrg,
  hasAnyOrgMembership,
  createDefaultOrg,
} from "@/lib/keto";
import { logAudit } from "./audit.service";

const DEFAULT_ORG_ID = process.env.DEFAULT_ORG_ID || "default-org";
const DEFAULT_USER_ROLE: "owners" | "admins" | "members" | "viewers" =
  "members";

/**
 * Assign default permissions to a new user
 */
export async function assignDefaultPermissions(
  userId: string,
): Promise<boolean> {
  try {
    console.log(`[User Setup] Setting up user ${userId}`);

    // Check if user already has any organization membership
    const hasOrg = await hasAnyOrgMembership(userId);

    if (hasOrg) {
      console.log(
        `[User Setup] User ${userId} already has organization membership`,
      );
      return true;
    }

    // Ensure default organization exists (idempotent operation)
    // In production, you'd check if the org exists first
    await ensureDefaultOrgExists();

    // Add user to default organization as a member
    const success = await addUserToOrg(
      userId,
      DEFAULT_ORG_ID,
      DEFAULT_USER_ROLE,
    );

    if (success) {
      console.log(
        `[User Setup] Added user ${userId} to ${DEFAULT_ORG_ID} as ${DEFAULT_USER_ROLE}`,
      );

      // Log the permission assignment
      await logAudit({
        userId,
        action: "assign_default_permissions",
        resource: `Organization:${DEFAULT_ORG_ID}`,
        result: "success",
        metadata: {
          orgId: DEFAULT_ORG_ID,
          role: DEFAULT_USER_ROLE,
        },
      });

      return true;
    } else {
      console.error(
        `[User Setup] Failed to add user ${userId} to organization`,
      );
      return false;
    }
  } catch (error) {
    console.error(`[User Setup] Error setting up user ${userId}:`, error);
    return false;
  }
}

/**
 * Ensure the default organization exists
 * In a real system, you would:
 * 1. Check if the org exists in your database
 * 2. Create it if it doesn't exist
 * 3. Set up the org with appropriate metadata
 */
async function ensureDefaultOrgExists(): Promise<void> {
  // This is a placeholder. In production, you would:
  // - Check a database to see if the org exists
  // - Create the org record in your database
  // - Set up the org's Keto relationships

  // For now, we'll just log
  console.log(`[User Setup] Ensuring default org ${DEFAULT_ORG_ID} exists`);

  // The org should already exist in Keto with proper relationships
  // If not, you would create it here with an admin owner
}

/**
 * Create a new organization for a user
 * Used when a user wants to create their own organization
 */
export async function createUserOrganization(
  orgId: string,
  ownerId: string,
): Promise<boolean> {
  try {
    const success = await createDefaultOrg(orgId, ownerId);

    if (success) {
      await logAudit({
        userId: ownerId,
        action: "create_organization",
        resource: `Organization:${orgId}`,
        result: "success",
        metadata: {
          orgId,
        },
      });
    }

    return success;
  } catch (error) {
    console.error(`[User Setup] Error creating organization ${orgId}:`, error);
    return false;
  }
}

/**
 * Promote a user to global admin
 * This should be restricted and audited
 */
export async function promoteToGlobalAdmin(
  userId: string,
  promotedBy: string,
): Promise<boolean> {
  try {
    const { makeGlobalAdmin } = await import("@/lib/keto");
    const success = await makeGlobalAdmin(userId);

    if (success) {
      await logAudit({
        userId: promotedBy,
        action: "promote_global_admin",
        resource: `User:${userId}`,
        result: "success",
        metadata: {
          promotedUserId: userId,
          isAdminAction: true,
          criticality: "high",
        },
      });
    }

    return success;
  } catch (error) {
    console.error(
      `[User Setup] Error promoting user ${userId} to admin:`,
      error,
    );
    return false;
  }
}
