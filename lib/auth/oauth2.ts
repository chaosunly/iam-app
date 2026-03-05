/**
 * OAuth2 Token Utilities
 * Helper functions for working with OAuth2 tokens from Hydra
 */

import { cookies } from "next/headers";
import { NextRequest } from "next/server";

export interface DecodedToken {
  sub: string; // User ID
  iss: string; // Issuer (Hydra)
  aud: string[]; // Audience (your client ID)
  exp: number; // Expiration timestamp
  iat: number; // Issued at timestamp
  client_id: string;
  scp?: string[]; // Scopes
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

/**
 * Get access token from cookies
 */
export async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("access_token")?.value || null;
}

/**
 * Get ID token from cookies
 */
export async function getIdToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("id_token")?.value || null;
}

/**
 * Get refresh token from cookies
 */
export async function getRefreshToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("refresh_token")?.value || null;
}

/**
 * Decode JWT token (without verification - for reading claims only)
 * For production, you should verify the signature against Hydra's public keys
 */
export function decodeToken(token: string): DecodedToken | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const decoded = JSON.parse(
      Buffer.from(payload, "base64").toString("utf-8")
    );

    return decoded;
  } catch (error) {
    console.error("Failed to decode token:", error);
    return null;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: DecodedToken): boolean {
  const now = Math.floor(Date.now() / 1000);
  return token.exp < now;
}

/**
 * Get current user from access token
 */
export async function getCurrentUser(): Promise<DecodedToken | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  const decoded = decodeToken(accessToken);
  if (!decoded || isTokenExpired(decoded)) return null;

  return decoded;
}

/**
 * Get user info from ID token (contains email, name, etc.)
 */
export async function getUserInfo(): Promise<DecodedToken | null> {
  const idToken = await getIdToken();
  if (!idToken) return null;

  const decoded = decodeToken(idToken);
  if (!decoded || isTokenExpired(decoded)) return null;

  return decoded;
}

/**
 * Check if user has required scope
 */
export async function hasScope(requiredScope: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user || !user.scp) return false;

  return user.scp.includes(requiredScope);
}

/**
 * Require authentication - throw error if not authenticated
 * Use this in API routes
 */
export async function requireAuth(): Promise<DecodedToken> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

/**
 * Get authorization header with Bearer token (for calling external APIs)
 */
export async function getAuthHeader(): Promise<string | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;
  return `Bearer ${accessToken}`;
}
