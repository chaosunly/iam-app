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

    // Get identity ID
    const { id } = await params;

    // Call service layer (BFF)
    await deleteIdentity(id);

    return createSuccessResponse({ message: "Identity deleted successfully" });
  });
}

