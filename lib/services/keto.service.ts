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

interface KetoRelationTupleResponse {
  namespace?: string;
  object?: string;
  relation?: string;
  subject_id?: string | { id?: string };
}

function toRelationTuple(rt: KetoRelationTupleResponse): RelationTuple {
  const subject =
    typeof rt.subject_id === "string" ? rt.subject_id : rt.subject_id?.id || "";

  return {
    namespace: rt.namespace || "",
    object: rt.object || "",
    relation: rt.relation || "",
    subject,
  };
}

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
export async function checkPermission(tuple: RelationTuple): Promise<boolean> {
  try {
    // Validate input
    if (
      !tuple.namespace ||
      !tuple.object ||
      !tuple.relation ||
      !tuple.subject
    ) {
      throw new BadRequestError("Invalid permission tuple");
    }

    const url = `${KETO_READ_URL}/relation-tuples/check`;
    console.log("[Keto] Checking permission:", {
      url,
      KETO_READ_URL,
      tuple,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formatTupleForApi(tuple)),
    });

    const responseText = await response.text();
    let data: PermissionCheck = { allowed: false };

    try {
      data = JSON.parse(responseText);
    } catch {
      // Keep default denied result when response body is not JSON.
    }

    // Keto returns 403 with {"allowed": false} for denied checks.
    // Treat this as a valid authz decision, not a transport/server failure.
    if (response.status === 403 && data.allowed === false) {
      console.log("[Keto] Check denied:", { tuple });
      return false;
    }

    if (!response.ok) {
      console.error("[Keto] Check failed:", {
        status: response.status,
        statusText: response.statusText,
        error: responseText,
        url,
      });
      return false; // Fail closed - deny by default
    }

    console.log("[Keto] Check result:", { allowed: data.allowed, tuple });
    return data.allowed === true;
  } catch (error) {
    console.error("[Keto] Error checking permission:", error, {
      url: `${KETO_READ_URL}/relation-tuples/check`,
      tuple,
    });
    return false; // Fail closed - deny by default
  }
}

/**
 * Grant permission (create relation tuple)
 */
export async function grantPermission(tuple: RelationTuple): Promise<void> {
  try {
    // Validate input
    if (
      !tuple.namespace ||
      !tuple.object ||
      !tuple.relation ||
      !tuple.subject
    ) {
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
      if (
        response.status === 404 &&
        error.includes("Unknown namespace with name")
      ) {
        throw new InternalServerError(
          `Failed to grant permission: namespace '${tuple.namespace}' is not defined in Keto permission model. ${error}`,
        );
      }
      throw new InternalServerError(`Failed to grant permission: ${error}`);
    }
  } catch (error) {
    if (
      error instanceof BadRequestError ||
      error instanceof InternalServerError
    ) {
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
    if (
      !tuple.namespace ||
      !tuple.object ||
      !tuple.relation ||
      !tuple.subject
    ) {
      throw new BadRequestError("Invalid permission tuple");
    }

    const params = new URLSearchParams({
      namespace: tuple.namespace,
      object: tuple.object,
      relation: tuple.relation,
      subject_id: tuple.subject,
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
    if (
      error instanceof BadRequestError ||
      error instanceof InternalServerError
    ) {
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
  namespace?: string,
): Promise<RelationTuple[]> {
  try {
    if (!userId) {
      throw new BadRequestError("userId is required");
    }

    const params = new URLSearchParams({
      subject_id: userId,
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
    return (data.relation_tuples || []).map((rt: KetoRelationTupleResponse) =>
      toRelationTuple(rt),
    );
  } catch (error) {
    if (
      error instanceof BadRequestError ||
      error instanceof InternalServerError
    ) {
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
  object: string,
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
    return (data.relation_tuples || []).map((rt: KetoRelationTupleResponse) =>
      toRelationTuple(rt),
    );
  } catch (error) {
    if (
      error instanceof BadRequestError ||
      error instanceof InternalServerError
    ) {
      throw error;
    }
    throw new InternalServerError("Failed to list object permissions");
  }
}

/**
 * List all tuples where a subject has a specific relation
 */
export async function listSubjectRelations(
  namespace: string,
  relation: string,
  subjectId: string,
): Promise<RelationTuple[]> {
  try {
    if (!namespace || !relation || !subjectId) {
      throw new BadRequestError(
        "namespace, relation, and subjectId are required",
      );
    }

    const params = new URLSearchParams({
      namespace,
      relation,
      subject_id: subjectId,
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
      throw new InternalServerError(`Failed to list relations: ${error}`);
    }

    const data = await response.json();
    return (data.relation_tuples || []).map((rt: KetoRelationTupleResponse) =>
      toRelationTuple(rt),
    );
  } catch (error) {
    if (
      error instanceof BadRequestError ||
      error instanceof InternalServerError
    ) {
      throw error;
    }
    throw new InternalServerError("Failed to list subject relations");
  }
}

/**
 * Batch permission check for multiple permissions
 */
export async function checkPermissions(
  tuples: RelationTuple[],
): Promise<boolean[]> {
  return Promise.all(tuples.map((tuple) => checkPermission(tuple)));
}

/**
 * Check if user has any of the specified roles
 */
export async function hasAnyRole(
  userId: string,
  roles: string[],
  namespace = "GlobalRole",
): Promise<boolean> {
  const checks = await Promise.all(
    roles.map((role) =>
      checkPermission({
        namespace,
        object: role,
        relation: "is_" + role.toLowerCase(),
        subject: userId,
      }),
    ),
  );

  return checks.some((allowed) => allowed);
}

/**
 * Check if user has all of the specified roles
 */
export async function hasAllRoles(
  userId: string,
  roles: string[],
  namespace = "GlobalRole",
): Promise<boolean> {
  const checks = await Promise.all(
    roles.map((role) =>
      checkPermission({
        namespace,
        object: role,
        relation: "is_" + role.toLowerCase(),
        subject: userId,
      }),
    ),
  );

  return checks.every((allowed) => allowed);
}
