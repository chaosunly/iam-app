/**
 * Admin Permissions API Route
 * BFF Layer: Handles permission management with Zero-Trust auth
 */

import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/middleware/auth.middleware";
import {
  grantPermission,
  revokePermission,
  listUserPermissions,
  listObjectPermissions,
} from "@/lib/services/keto.service";
import {
  createSuccessResponse,
  withErrorHandler,
  BadRequestError,
} from "@/lib/errors";
import { RelationTuple } from "@/lib/types";

/**
 * GET /api/admin/permissions
 * List permissions for a user or object
 * Requires: Admin role
 */
export async function GET(request: NextRequest) {
  return withErrorHandler(async () => {
    // Zero-Trust: Authenticate and authorize
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const namespace = searchParams.get("namespace");
    const object = searchParams.get("object");

    let permissions: RelationTuple[];

    if (userId) {
      // List permissions for a specific user
      permissions = await listUserPermissions(
        userId,
        namespace || undefined
      );
    } else if (namespace && object) {
      // List permissions for a specific object
      permissions = await listObjectPermissions(namespace, object);
    } else {
      throw new BadRequestError(
        "Either userId or (namespace + object) is required"
      );
    }

    return createSuccessResponse(permissions);
  });
}

/**
 * POST /api/admin/permissions
 * Grant a permission to a user
 * Requires: Admin role
 */
export async function POST(request: NextRequest) {
  return withErrorHandler(async () => {
    // Zero-Trust: Authenticate and authorize
    await requireAdmin(request);

    const body: RelationTuple = await request.json();

    // Validate required fields
    if (!body.namespace || !body.object || !body.relation || !body.subject) {
      throw new BadRequestError(
        "namespace, object, relation, and subject are required"
      );
    }

    // Grant permission
    await grantPermission(body);

    return createSuccessResponse(
      { message: "Permission granted successfully" }, 
      201
    );
  });
}

/**
 * DELETE /api/admin/permissions
 * Revoke a permission from a user
 * Requires: Admin role
 */
export async function DELETE(request: NextRequest) {
  return withErrorHandler(async () => {
    // Zero-Trust: Authenticate and authorize
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    
    const namespace = searchParams.get("namespace");
    const object = searchParams.get("object");
    const relation = searchParams.get("relation");
    const subject = searchParams.get("subject");

    if (!namespace || !object || !relation || !subject) {
      throw new BadRequestError(
        "namespace, object, relation, and subject are required"
      );
    }

    // Revoke permission
    await revokePermission({
      namespace,
      object,
      relation,
      subject,
    });

    return createSuccessResponse({
      message: "Permission revoked successfully",
    });
  });
}
