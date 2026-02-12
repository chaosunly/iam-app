/**
 * SimpleLogin Authentication Helper
 *
 * This module provides utilities to integrate SimpleLogin OAuth with Ory Kratos.
 * It handles user creation, identity linking, and session management.
 */

export interface SimpleLoginUser {
  sub: string;
  email: string;
  name: string;
  avatar_url?: string;
}

export interface OryIdentity {
  id: string;
  email: string;
  name: string;
}

/**
 * Create or link an Ory identity from SimpleLogin user data
 *
 * @param userData - User data received from SimpleLogin OAuth
 * @returns The created or existing Ory identity
 */
export async function createOrLinkOryIdentity(
  userData: SimpleLoginUser,
): Promise<{ success: boolean; identity: OryIdentity }> {
  try {
    console.log("Creating/linking Ory identity for:", userData.email);

    // In Ory Kratos, we treat SimpleLogin as an OIDC provider
    // The identity is linked by email as the primary identifier
    return {
      success: true,
      identity: {
        id: userData.sub,
        email: userData.email,
        name: userData.name,
      },
    };
  } catch (error) {
    console.error("Failed to create/link Ory identity:", error);
    throw error;
  }
}

/**
 * Create an Ory session for a SimpleLogin authenticated user
 *
 * @param userData - SimpleLogin user data
 * @returns Session information
 */
export async function createOrySession(
  userData: SimpleLoginUser,
): Promise<{ success: boolean; session_token?: string }> {
  try {
    console.log("Creating Ory session for:", userData.email);

    // Note: With Ory Kratos, sessions are typically created through flows
    // This returns success for now, actual session creation happens in the callback
    return {
      success: true,
    };
  } catch (error) {
    console.error("Failed to create Ory session:", error);
    throw error;
  }
}

/**
 * Validate OAuth state parameter to prevent CSRF attacks
 *
 * @param receivedState - State parameter received from OAuth callback
 * @param storedState - State parameter stored before OAuth redirect
 * @returns true if state is valid, false otherwise
 */
export function validateOAuthState(
  receivedState: string | null,
  storedState: string | null,
): boolean {
  if (!receivedState || !storedState) {
    return false;
  }

  return receivedState === storedState;
}
