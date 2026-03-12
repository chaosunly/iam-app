/**
 * Admin Identity Access API Route
 * Returns aggregated roles, permissions, and service access for a specific identity
 */

import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/middleware/auth.middleware";
import { listUserPermissions } from "@/lib/services/keto.service";
import { getUserGitlabRoles } from "@/lib/services/gitlab.service";
import { createSuccessResponse, withErrorHandler } from "@/lib/errors";

/**
 * GET /api/admin/identities/[id]/access
 * Get roles, permissions, and service access for a specific identity
 * Requires: Admin role
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withErrorHandler(async () => {
    await requireAdmin(request);

    const { id: userId } = await params;

    const [permissions, gitlabRoles] = await Promise.all([
      listUserPermissions(userId),
      getUserGitlabRoles(userId),
    ]);

    // Categorize Keto relation tuples by namespace
    const globalRoles = permissions
      .filter((p) => p.namespace === "GlobalRole")
      .map((p) => ({
        role: p.relation === "members" ? p.object : p.relation,
        object: p.object,
      }));

    const orgRoles = permissions
      .filter((p) => p.namespace === "Organization")
      .map((p) => ({ organizationId: p.object, role: p.relation }));

    const groupMemberships = permissions
      .filter((p) => p.namespace === "Group")
      .map((p) => ({ groupId: p.object, role: p.relation }));

    return createSuccessResponse({
      globalRoles,
      orgRoles,
      groupMemberships,
      gitlabAccess: gitlabRoles.map((r) => ({
        resourceType: r.resourceType,
        resourceId: r.resourceId,
        role: r.role,
      })),
    });
  });
}
