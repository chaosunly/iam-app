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
} from './kratos.service';

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
} from './keto.service';
