/**
 * Keto Service - BFF Layer for Authorization
 * Handles all communication with Ory Keto Permission API
 * Implements Zanzibar-style permissions (Google's authorization system)
 */

import { RelationTuple, PermissionCheck } from "@/lib/types";
import { InternalServerError, BadRequestError } from "@/lib/errors";

const KETO_READ_URL = process.env.ORY_KETO_READ_URL || "http://localhost:4466";
const KETO_WRITE_URL =
  process.env.ORY_KETO_WRITE_URL || "http://localhost:4467";

/**
 * Format tuple for Keto API
 */
function formatTupleForApi(tuple: RelationTuple) {
  return {
    namespace: tuple.namespace,
    object: tuple.object,
    relation: tuple.relation,
    subject_id: tuple.subject,
  };
}

/**
 * Check if a subject has permission (Zero-Trust verification)
 */
export async function checkPermission(
  tuple: RelationTuple
): Promise<boolean> {
  try {
    // Validate input
    if (!tuple.namespace || !tuple.object || !tuple.relation || !tuple.subject) {
      throw new BadRequestError("Invalid permission tuple");
    }

    const url = `${KETO_READ_URL}/relation-tuples/check`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formatTupleForApi(tuple)),
    });

    if (!response.ok) {
      console.error("Keto check failed:", await response.text());
      return false; // Fail closed - deny by default
    }

    const data: PermissionCheck = await response.json();
    return data.allowed === true;
  } catch (error) {
    console.error("Error checking permission:", error);
    return false; // Fail closed - deny by default
  }
}

/**
 * Grant permission (create relation tuple)
 */
export async function grantPermission(tuple: RelationTuple): Promise<void> {
  try {
    // Validate input
    if (!tuple.namespace || !tuple.object || !tuple.relation || !tuple.subject) {
      throw new BadRequestError("Invalid permission tuple");
    }

    const url = `${KETO_WRITE_URL}/admin/relation-tuples`;
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formatTupleForApi(tuple)),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new InternalServerError(`Failed to grant permission: ${error}`);
    }
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof InternalServerError) {
      throw error;
    }
    throw new InternalServerError("Failed to grant permission");
  }
}

/**
 * Revoke permission (delete relation tuple)
 */
export async function revokePermission(tuple: RelationTuple): Promise<void> {
  try {
    // Validate input
    if (!tuple.namespace || !tuple.object || !tuple.relation || !tuple.subject) {
      throw new BadRequestError("Invalid permission tuple");
    }

    const params = new URLSearchParams({
      namespace: tuple.namespace,
      object: tuple.object,
      relation: tuple.relation,
      "subject_id.id": tuple.subject,
    });

    const url = `${KETO_WRITE_URL}/admin/relation-tuples?${params}`;
    const response = await fetch(url, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.text();
      throw new InternalServerError(`Failed to revoke permission: ${error}`);
    }
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof InternalServerError) {
      throw error;
    }
    throw new InternalServerError("Failed to revoke permission");
  }
}

/**
 * List all permissions for a subject (user)
 */
export async function listUserPermissions(
  userId: string,
  namespace?: string
): Promise<RelationTuple[]> {
  try {
    if (!userId) {
      throw new BadRequestError("userId is required");
    }

    const params = new URLSearchParams({
      "subject_id.id": userId,
    });

    if (namespace) {
      params.append("namespace", namespace);
    }

    const url = `${KETO_READ_URL}/relation-tuples?${params}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new InternalServerError(`Failed to list permissions: ${error}`);
    }

    const data = await response.json();
    return (data.relation_tuples || []).map((rt: Record<string, any>) => ({
      namespace: rt.namespace,
      object: rt.object,
      relation: rt.relation,
      subject: rt.subject_id?.id || rt.subject_id,
    }));
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof InternalServerError) {
      throw error;
    }
    throw new InternalServerError("Failed to list user permissions");
  }
}

/**
 * List all permissions for an object
 */
export async function listObjectPermissions(
  namespace: string,
  object: string
): Promise<RelationTuple[]> {
  try {
    if (!namespace || !object) {
      throw new BadRequestError("namespace and object are required");
    }

    const params = new URLSearchParams({
      namespace,
      object,
    });

    const url = `${KETO_READ_URL}/relation-tuples?${params}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new InternalServerError(`Failed to list permissions: ${error}`);
    }

    const data = await response.json();
    return (data.relation_tuples || []).map((rt: Record<string, any>) => ({
      namespace: rt.namespace,
      object: rt.object,
      relation: rt.relation,
      subject: rt.subject_id?.id || rt.subject_id,
    }));
  } catch (error) {
    if (error instanceof BadRequestError || error instanceof InternalServerError) {
      throw error;
    }
    throw new InternalServerError("Failed to list object permissions");
  }
}

/**
 * Batch permission check for multiple permissions
 */
export async function checkPermissions(
  tuples: RelationTuple[]
): Promise<boolean[]> {
  return Promise.all(tuples.map((tuple) => checkPermission(tuple)));
}

/**
 * Check if user has any of the specified roles
 */
export async function hasAnyRole(
  userId: string,
  roles: string[],
  namespace = "GlobalRole"
): Promise<boolean> {
  const checks = await Promise.all(
    roles.map((role) =>
      checkPermission({
        namespace,
        object: role,
        relation: "is_" + role.toLowerCase(),
        subject: userId,
      })
    )
  );

  return checks.some((allowed) => allowed);
}

/**
 * Check if user has all of the specified roles
 */
export async function hasAllRoles(
  userId: string,
  roles: string[],
  namespace = "GlobalRole"
): Promise<boolean> {
  const checks = await Promise.all(
    roles.map((role) =>
      checkPermission({
        namespace,
        object: role,
        relation: "is_" + role.toLowerCase(),
        subject: userId,
      })
    )
  );

  return checks.every((allowed) => allowed);
}
