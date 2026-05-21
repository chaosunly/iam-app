/**
 * Admin Identity Detail API Route
 * BFF Layer: Handles individual identity operations with Zero-Trust auth
 */

import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/middleware/auth.middleware";
import {
  getIdentity,
  updateIdentity,
  deleteIdentity,
} from "@/lib/services/kratos.service";
import {
  createSuccessResponse,
  withErrorHandler,
} from "@/lib/errors";
import { CreateIdentityRequest } from "@/lib/types";
import { prisma } from "@/lib/db";
import { getUserGroups } from "@/lib/services/group.service";
import { revokePermission } from "@/lib/services/keto.service";
import { syncGroupRoomLeave } from "@/lib/services/matrix-provision.service";
import { removeOrganizationMember, getDefaultOrganizationId } from "@/lib/services/organization.service";

/**
 * GET /api/admin/identities/[id]
 * Get a single identity by ID
 * Requires: Admin role
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandler(async () => {
    // Zero-Trust: Authenticate and authorize
    await requireAdmin(request);

    // Get identity ID from params
    const { id } = await params;

    // Call service layer (BFF)
    const identity = await getIdentity(id);

    return createSuccessResponse(identity);
  });
}

/**
 * PUT /api/admin/identities/[id]
 * Update an identity
 * Requires: Admin role
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandler(async () => {
    // Zero-Trust: Authenticate and authorize
    await requireAdmin(request);

    // Get identity ID and body
    const { id } = await params;
    const body: Partial<CreateIdentityRequest> = await request.json();

    // Call service layer (BFF)
    const identity = await updateIdentity(id, body);

    return createSuccessResponse(identity);
  });
}

/**
 * PATCH /api/admin/identities/[id]
 * Partially update an identity (same as PUT for now)
 * Requires: Admin role
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandler(async () => {
    // Zero-Trust: Authenticate and authorize
    await requireAdmin(request);

    // Get identity ID and body
    const { id } = await params;
    const body: Partial<CreateIdentityRequest> = await request.json();

    // Call service layer (BFF)
    const identity = await updateIdentity(id, body);

    return createSuccessResponse(identity);
  });
}

/**
 * DELETE /api/admin/identities/[id]
 * Delete an identity
 * Requires: Admin role
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandler(async () => {
    // Zero-Trust: Authenticate and authorize
    await requireAdmin(request);

    const { id } = await params;

    // Kick from Matrix rooms and remove from all groups before deletion.
    // Must be awaited — matrixAccount.deleteMany below would otherwise race
    // with the async kick and cause syncGroupRoomLeave to skip it (account = null).
    const userGroups = await getUserGroups(id);
    await Promise.allSettled([
      ...userGroups.map((group) => syncGroupRoomLeave(group.id, id)),
      ...userGroups.flatMap((group) => [
        revokePermission({ namespace: "Group", object: group.id, relation: "members", subject: id }),
        revokePermission({ namespace: "Group", object: group.id, relation: "admins", subject: id }),
      ]),
    ]);

    // Remove org membership so the user no longer appears in the org member list
    await removeOrganizationMember(getDefaultOrganizationId(), id, id).catch(() => {});

    await deleteIdentity(id);

    // Clean up Matrix account record so the email/UUID can be reused
    await prisma.matrixAccount.deleteMany({ where: { iamUserId: id } });

    return createSuccessResponse({ message: "Identity deleted successfully" });
  });
}

