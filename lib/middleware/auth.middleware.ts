import { getServerSession } from "@ory/nextjs/app";
import { NextRequest } from "next/server";
import { checkPermission } from "@/lib/services/keto.service";
import { UserContext } from "@/lib/types";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";

/**
 * Zero-Trust Auth Middleware
 * Verifies user session and extracts user context
 * Every request must be authenticated - no trust by default
 */
export async function requireAuth(_request: NextRequest): Promise<UserContext> {
  const session = await getServerSession();

  if (!session) {
    throw new UnauthorizedError("Authentication required");
  }

  if (!session.identity?.id) {
    throw new UnauthorizedError("Invalid session");
  }

  return {
    userId: session.identity.id,
    identity: session.identity as any, // Type mismatch with Ory SDK
    sessionId: session.id,
  };
}

/**
 * Zero-Trust Permission Middleware
 * Checks if user has specific permission using Ory Keto
 * Always verify permissions, never assume
 */
export async function requirePermission(
  userContext: UserContext,
  permission: {
    namespace: string;
    object: string;
    relation: string;
  }
): Promise<void> {
  const hasPermission = await checkPermission({
    namespace: permission.namespace,
    object: permission.object,
    relation: permission.relation,
    subject: userContext.userId,
  });

  if (!hasPermission) {
    throw new ForbiddenError(
      `Permission required: ${permission.namespace}:${permission.object}#${permission.relation}`
    );
  }
}

/**
 * Combined auth + permission check for admin routes
 * Implements Zero-Trust: authenticate, then authorize
 */
export async function requireAdmin(request: NextRequest): Promise<UserContext> {
  // Step 1: Authenticate
  const userContext = await requireAuth(request);

  // Step 2: Authorize
  await requirePermission(userContext, {
    namespace: "GlobalRole",
    object: "admin",
    relation: "is_admin",
  });

  return userContext;
}

/**
 * Check if user has specific role
 */
export async function hasRole(
  userId: string,
  role: string,
  namespace = "GlobalRole"
): Promise<boolean> {
  return checkPermission({
    namespace,
    object: role,
    relation: "is_" + role.toLowerCase(),
    subject: userId,
  });
}

/**
 * Check multiple permissions (OR logic)
 * User needs at least one of the permissions
 */
export async function requireAnyPermission(
  userContext: UserContext,
  permissions: Array<{
    namespace: string;
    object: string;
    relation: string;
  }>
): Promise<void> {
  const checks = await Promise.all(
    permissions.map((perm) =>
      checkPermission({
        namespace: perm.namespace,
        object: perm.object,
        relation: perm.relation,
        subject: userContext.userId,
      })
    )
  );

  if (!checks.some((allowed: boolean) => allowed)) {
    throw new ForbiddenError("Insufficient permissions");
  }
}

/**
 * Check multiple permissions (AND logic)
 * User needs all of the permissions
 */
export async function requireAllPermissions(
  userContext: UserContext,
  permissions: Array<{
    namespace: string;
    object: string;
    relation: string;
  }>
): Promise<void> {
  const checks = await Promise.all(
    permissions.map((perm) =>
      checkPermission({
        namespace: perm.namespace,
        object: perm.object,
        relation: perm.relation,
        subject: userContext.userId,
      })
    )
  );

  if (!checks.every((allowed: boolean) => allowed)) {
    throw new ForbiddenError("Insufficient permissions");
  }
}
