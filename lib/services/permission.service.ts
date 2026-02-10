/**
 * Permission Service - Handles Keto permission checks with caching
 * Implements session caching to reduce load on Keto
 */

import { checkPermission, RelationTuple } from "@/lib/keto";
import { logAudit } from "./audit.service";

// Simple in-memory cache with TTL
interface CacheEntry {
  allowed: boolean;
  timestamp: number;
}

// Cache for 5 minutes (300000ms)
const CACHE_TTL = 5 * 60 * 1000;
const permissionCache = new Map<string, CacheEntry>();

// Generate cache key from tuple
function getCacheKey(tuple: RelationTuple): string {
  return `${tuple.namespace}:${tuple.object}:${tuple.relation}:${tuple.subject}`;
}

// Clear expired cache entries
function cleanCache() {
  const now = Date.now();
  for (const [key, entry] of permissionCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      permissionCache.delete(key);
    }
  }
}

// Clean cache every minute
setInterval(cleanCache, 60000);

/**
 * Check permission with caching
 */
export async function checkPermissionCached(
  tuple: RelationTuple,
  skipCache = false,
): Promise<boolean> {
  const cacheKey = getCacheKey(tuple);

  // Check cache first
  if (!skipCache) {
    const cached = permissionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log("[Permission] Cache hit:", cacheKey);
      return cached.allowed;
    }
  }

  // Not in cache or expired, check with Keto
  console.log("[Permission] Cache miss, checking Keto:", cacheKey);
  const allowed = await checkPermission(tuple);

  // Store in cache
  permissionCache.set(cacheKey, {
    allowed,
    timestamp: Date.now(),
  });

  return allowed;
}

/**
 * Invalidate cache for a specific user
 */
export function invalidateUserCache(userId: string) {
  for (const [key] of permissionCache.entries()) {
    if (key.endsWith(`:${userId}`)) {
      permissionCache.delete(key);
    }
  }
}

/**
 * Clear entire cache
 */
export function clearPermissionCache() {
  permissionCache.clear();
}

/**
 * Check if user is a global admin
 */
export async function isGlobalAdmin(userId: string): Promise<boolean> {
  const allowed = await checkPermissionCached({
    namespace: "GlobalRole",
    object: "admin",
    relation: "members",
    subject: userId,
  });

  // Log admin access checks
  if (allowed) {
    await logAudit({
      userId,
      action: "check_permission",
      resource: "GlobalRole:admin",
      result: "granted",
      metadata: {
        type: "global_admin_check",
      },
    });
  }

  return allowed;
}

/**
 * Check if user has permission in an organization
 */
export async function hasOrgPermission(
  userId: string,
  orgId: string,
  permission:
    | "manage_org"
    | "manage_users"
    | "manage_groups"
    | "manage_roles"
    | "view_org"
    | "is_member",
): Promise<boolean> {
  // First check if global admin
  const isAdmin = await isGlobalAdmin(userId);
  if (isAdmin) {
    return true;
  }

  // Check specific org permission
  const allowed = await checkPermissionCached({
    namespace: "Organization",
    object: orgId,
    relation: permission,
    subject: userId,
  });

  // Log permission check
  await logAudit({
    userId,
    action: "check_permission",
    resource: `Organization:${orgId}:${permission}`,
    result: allowed ? "granted" : "denied",
    metadata: {
      type: "org_permission_check",
      orgId,
      permission,
    },
  });

  return allowed;
}

/**
 * Get user dashboard route based on permissions
 */
export async function getUserDashboardRoute(userId: string): Promise<string> {
  // Check if user is global admin
  const isAdmin = await isGlobalAdmin(userId);

  if (isAdmin) {
    return "/admin";
  }

  // Regular user goes to dashboard
  return "/dashboard";
}

/**
 * Check if user can access admin panel
 */
export async function canAccessAdmin(userId: string): Promise<boolean> {
  return await isGlobalAdmin(userId);
}

/**
 * Check if user is member of any organization
 */
export async function isMemberOfAnyOrg(_userId: string): Promise<boolean> {
  // This is a simplified check - in production, you'd query for all orgs
  // and check membership. For now, we'll assume if not admin, they're a regular user.
  return true;
}
