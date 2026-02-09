// Ory Keto client for permission checking

const KETO_READ_URL = process.env.ORY_KETO_READ_URL || "http://localhost:4466";
const KETO_WRITE_URL = process.env.ORY_KETO_WRITE_URL || "http://localhost:4467";

export interface RelationTuple {
  namespace: string;
  object: string;
  relation: string;
  subject: string;
}

// Format tuple for Keto API (subject_id as string)
function formatTupleForApi(tuple: RelationTuple) {
  return {
    namespace: tuple.namespace,
    object: tuple.object,
    relation: tuple.relation,
    subject_id: tuple.subject,
  };
}

// Check if a subject has permission
export async function checkPermission(tuple: RelationTuple): Promise<boolean> {
  try {
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
      return false;
    }

    const data = await response.json();
    return data.allowed === true;
  } catch (error) {
    console.error("Error checking permission:", error);
    return false;
  }
}

// Create a relation tuple (grant permission)
export async function createRelation(tuple: RelationTuple): Promise<boolean> {
  try {
    const url = `${KETO_WRITE_URL}/admin/relation-tuples`;
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formatTupleForApi(tuple)),
    });

    if (!response.ok) {
      console.error("Keto create failed:", await response.text());
    }

    return response.ok;
  } catch (error) {
    console.error("Error creating relation:", error);
    return false;
  }
}

// Delete a relation tuple (revoke permission)
export async function deleteRelation(tuple: RelationTuple): Promise<boolean> {
  try {
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

    return response.ok;
  } catch (error) {
    console.error("Error deleting relation:", error);
    return false;
  }
}

// List all relations for a subject
export async function listUserPermissions(
  userId: string,
  namespace?: string
): Promise<RelationTuple[]> {
  try {
    const params = new URLSearchParams({
      "subject_id.id": userId,
    });

    if (namespace) {
      params.append("namespace", namespace);
    }

    const url = `${KETO_READ_URL}/relation-tuples?${params}`;
    const response = await fetch(url);

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.relation_tuples || [];
  } catch (error) {
    console.error("Error listing permissions:", error);
    return [];
  }
}

// List all relations in a namespace
export async function listAllPermissions(
  namespace: string
): Promise<RelationTuple[]> {
  try {
    const params = new URLSearchParams({
      namespace: namespace,
    });

    const url = `${KETO_READ_URL}/relation-tuples?${params}`;
    const response = await fetch(url);

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.relation_tuples || [];
  } catch (error) {
    console.error("Error listing all permissions:", error);
    return [];
  }
}
