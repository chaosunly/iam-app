/**
 * Auto-Provision Service
 * Automatically provisions new users with default permissions
 * Ensures all authenticated users have basic organization membership
 */

import {
  checkPermission,
  grantPermission,
  assertRequiredKetoNamespaces,
} from "./keto.service";
import { getDefaultOrganizationId } from "./organization.service";
import { logAudit } from "./audit.service";

/**
 * Check if user has any permissions in the system
 */
async function hasAnyPermissions(userId: string): Promise<boolean> {
  const orgId = getDefaultOrganizationId();

  // Check if user is a member of the default organization
  const isMember = await checkPermission({
    namespace: "Organization",
    object: orgId,
    relation: "members",
    subject: userId,
  });

  if (isMember) return true;

  // Check if user is an admin
  const isAdmin = await checkPermission({
    namespace: "Organization",
    object: orgId,
    relation: "admins",
    subject: userId,
  });

  if (isAdmin) return true;

  // Check if user is an owner
  const isOwner = await checkPermission({
    namespace: "Organization",
    object: orgId,
    relation: "owners",
    subject: userId,
  });

  return isOwner;
}

/**
 * Auto-provision a user with default permissions
 * Called on first login or dashboard access
 */
export async function autoProvisionUser(userId: string): Promise<void> {
  try {
    await assertRequiredKetoNamespaces();

    // Check if user already has permissions
    const hasPermissions = await hasAnyPermissions(userId);

    if (hasPermissions) {
      // User already provisioned
      return;
    }

    console.log(`[AutoProvision] Provisioning new user: ${userId}`);

    const orgId = getDefaultOrganizationId();

    // Add user to default organization as a member
    await grantPermission({
      namespace: "Organization",
      object: orgId,
      relation: "members",
      subject: userId,
    });

    // Log the provisioning
    await logAudit({
      userId: "system",
      action: "auto_provision_user",
      resource: `User:${userId}`,
      result: "granted",
      metadata: {
        organizationId: orgId,
        role: "member",
      },
    });

    console.log(`[AutoProvision] ✓ User ${userId} added to ${orgId} as member`);
  } catch (error) {
    console.error("[AutoProvision] Error provisioning user:", error);
    // Don't throw - let user continue even if provisioning fails
    // They can be manually provisioned by an admin later
  }
}

/**
 * Bulk provision multiple users
 * Useful for migrating existing users
 */
export async function bulkProvisionUsers(
  userIds: string[],
): Promise<{ success: string[]; failed: string[] }> {
  const results = {
    success: [] as string[],
    failed: [] as string[],
  };

  for (const userId of userIds) {
    try {
      await autoProvisionUser(userId);
      results.success.push(userId);
    } catch (error) {
      console.error(`[BulkProvision] Failed for user ${userId}:`, error);
      results.failed.push(userId);
    }
  }

  console.log(
    `[BulkProvision] Complete: ${results.success.length} success, ${results.failed.length} failed`,
  );

  return results;
}
