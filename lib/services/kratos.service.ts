/**
 * Kratos Service - BFF Layer for Identity Management
 * Handles all communication with Ory Kratos Admin API
 * Implements Zero-Trust: always validate responses
 */

import { Identity, CreateIdentityRequest } from "@/lib/types";
import {
  InternalServerError,
  NotFoundError,
  BadRequestError,
} from "@/lib/errors";

const KRATOS_ADMIN_URL = process.env.ORY_KRATOS_ADMIN_URL;

if (!KRATOS_ADMIN_URL) {
  throw new Error("ORY_KRATOS_ADMIN_URL environment variable is not set");
}

/**
 * Fetch all identities with pagination
 */
export async function listIdentities(
  page = 0,
  perPage = 250,
): Promise<Identity[]> {
  try {
    const url = `${KRATOS_ADMIN_URL}/admin/identities?page=${page}&per_page=${perPage}`;

    console.log("Fetching identities from:", url); // Debug log

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Kratos API error:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        url,
      });
      throw new InternalServerError(
        `Kratos API error: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    const identities: Identity[] = await response.json();
    return identities;
  } catch (error) {
    console.error("Failed to list identities:", error); // Debug log
    if (error instanceof InternalServerError) throw error;
    throw new InternalServerError(
      "Failed to list identities: " + (error as Error).message,
    );
  }
}

/**
 * Get a single identity by ID
 */
export async function getIdentity(id: string): Promise<Identity> {
  try {
    const url = `${KRATOS_ADMIN_URL}/admin/identities/${id}`;
    console.log("Fetching identity from:", url);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 404) {
      throw new NotFoundError(`Identity ${id} not found`);
    }

    if (!response.ok) {
      const error = await response.text();
      throw new InternalServerError(`Failed to fetch identity: ${error}`);
    }

    return await response.json();
  } catch (error) {
    if (
      error instanceof NotFoundError ||
      error instanceof InternalServerError
    ) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      console.error("Timeout fetching identity:", id);
      throw new InternalServerError("Request timeout while fetching identity");
    }
    console.error("Failed to get identity:", error);
    throw new InternalServerError(
      "Failed to get identity: " + (error as Error).message,
    );
  }
}

/**
 * Create a new identity
 */
export async function createIdentity(
  data: CreateIdentityRequest,
): Promise<Identity> {
  try {
    // Validate request
    if (!data.schema_id || !data.traits) {
      throw new BadRequestError("schema_id and traits are required");
    }

    const response = await fetch(`${KRATOS_ADMIN_URL}/admin/identities`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new InternalServerError(`Failed to create identity: ${error}`);
    }

    return await response.json();
  } catch (error) {
    if (
      error instanceof BadRequestError ||
      error instanceof InternalServerError
    ) {
      throw error;
    }
    throw new InternalServerError("Failed to create identity");
  }
}

/**
 * Update an identity
 */
export async function updateIdentity(
  id: string,
  data: Partial<CreateIdentityRequest>,
): Promise<Identity> {
  try {
    const response = await fetch(`${KRATOS_ADMIN_URL}/admin/identities/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        schema_id: data.schema_id || "default",
        traits: data.traits || {},
        state: data.state,
        metadata_public: data.metadata_public,
      }),
    });

    if (response.status === 404) {
      throw new NotFoundError(`Identity ${id} not found`);
    }

    if (!response.ok) {
      const error = await response.text();
      throw new InternalServerError(`Failed to update identity: ${error}`);
    }

    return await response.json();
  } catch (error) {
    if (
      error instanceof NotFoundError ||
      error instanceof InternalServerError
    ) {
      throw error;
    }
    throw new InternalServerError("Failed to update identity");
  }
}

/**
 * Delete an identity
 */
export async function deleteIdentity(id: string): Promise<void> {
  try {
    const response = await fetch(`${KRATOS_ADMIN_URL}/admin/identities/${id}`, {
      method: "DELETE",
    });

    if (response.status === 404) {
      throw new NotFoundError(`Identity ${id} not found`);
    }

    if (!response.ok) {
      const error = await response.text();
      throw new InternalServerError(`Failed to delete identity: ${error}`);
    }
  } catch (error) {
    if (
      error instanceof NotFoundError ||
      error instanceof InternalServerError
    ) {
      throw error;
    }
    throw new InternalServerError("Failed to delete identity");
  }
}

/**
 * Search identities by traits
 */
export async function searchIdentities(
  searchTerm: string,
): Promise<Identity[]> {
  // Note: Kratos doesn't have native search, so we fetch all and filter
  // For production, consider implementing a search index
  const identities = await listIdentities(0, 1000);

  return identities.filter((identity) => {
    const traitsString = JSON.stringify(identity.traits).toLowerCase();
    return traitsString.includes(searchTerm.toLowerCase());
  });
}
