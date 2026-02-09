/**
 * Admin Identities API Route
 * BFF Layer: Handles identity management with Zero-Trust auth
 */

import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/middleware/auth.middleware";
import {
  listIdentities,
  createIdentity,
} from "@/lib/services/kratos.service";
import {
  createSuccessResponse,
  withErrorHandler,
} from "@/lib/errors";
import { CreateIdentityRequest } from "@/lib/types";

/**
 * GET /api/admin/identities
 * List all identities with pagination
 * Requires: Admin role
 */
export async function GET(request: NextRequest) {
  return withErrorHandler(async () => {
    // Zero-Trust: Authenticate and authorize
    await requireAdmin(request);

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "0");
    const perPage = parseInt(searchParams.get("per_page") || "250");

    // Call service layer (BFF)
    const identities = await listIdentities(page, perPage);

    return createSuccessResponse(identities);
  });
}

/**
 * POST /api/admin/identities
 * Create a new identity
 * Requires: Admin role
 */
export async function POST(request: NextRequest) {
  return withErrorHandler(async () => {
    // Zero-Trust: Authenticate and authorize
    await requireAdmin(request);

    // Parse and validate request body
    const body: CreateIdentityRequest = await request.json();

    // Call service layer (BFF)
    const identity = await createIdentity(body);

    return createSuccessResponse(identity, 201);
  });
}
