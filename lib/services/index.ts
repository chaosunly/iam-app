/**
 * Service Layer Exports
 * Central export point for all BFF services
 */

// Kratos Service (Identity Management)
export {
  listIdentities,
  getIdentity,
  createIdentity,
  updateIdentity,
  deleteIdentity,
  searchIdentities,
} from "./kratos.service";

// Keto Service (Authorization)
export {
  checkPermission,
  grantPermission,
  revokePermission,
  listUserPermissions,
  listObjectPermissions,
  checkPermissions,
  hasAnyRole,
  hasAllRoles,
} from "./keto.service";

// Permission Service (Permission checks with caching)
export {
  checkPermissionCached,
  invalidateUserCache,
  clearPermissionCache,
  isGlobalAdmin,
  hasOrgPermission,
  getUserDashboardRoute,
  canAccessAdmin,
  isMemberOfAnyOrg,
} from "./permission.service";

// Audit Service (Security logging)
export {
  logAudit,
  logPermissionCheck,
  logAdminAction,
  logAuthEvent,
  logAccessDenied,
} from "./audit.service";

// User Setup Service (New user onboarding)
export {
  assignDefaultPermissions,
  createUserOrganization,
  promoteToGlobalAdmin,
} from "./user-setup.service";

// Keto Helper Functions (Direct Keto operations)
export {
  checkKetoHealth,
  makeGlobalAdmin,
  revokeGlobalAdmin,
  addUserToOrg,
  removeUserFromOrg,
  createDefaultOrg,
  hasAnyOrgMembership,
} from "../keto";
