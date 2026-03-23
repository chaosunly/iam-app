/**
 * Matrix Org Namespace for Keto
 * Represents a Matrix homeserver organisation (top of the hierarchy)
 *
 * Relations:
 * - matrix_admin: Full control — manage users, roles, spaces, rooms, view audit
 * - moderator:    Manage rooms and users within their space scope
 * - support:      Impersonate users for support sessions, view audit
 * - member:       Regular participant
 * - viewer:       Read-only presence
 *
 * Permissions:
 * - manage_users:        matrix_admin
 * - manage_roles:        matrix_admin
 * - manage_spaces:       matrix_admin
 * - manage_rooms:        matrix_admin
 * - view_audit:          matrix_admin, support
 * - impersonate_support: support
 * - view_content:        all roles
 *
 * Example tuples:
 * MatrixOrg:acme-corp#matrix_admin@User:cl9abc123
 * MatrixOrg:acme-corp#support@User:cl9def456
 * MatrixOrg:acme-corp#member@User:cl9ghi789
 */

export const matrixOrgNamespace = {
  name: "MatrixOrg",

  relations: {
    matrix_admin: "matrix_admin",
    moderator:    "moderator",
    support:      "support",
    member:       "member",
    viewer:       "viewer",
  },

  permissions: {
    manage_users:         ["matrix_admin"],
    manage_roles:         ["matrix_admin"],
    manage_spaces:        ["matrix_admin"],
    manage_rooms:         ["matrix_admin"],
    view_audit:           ["matrix_admin", "support"],
    impersonate_support:  ["support"],
    view_content:         ["matrix_admin", "moderator", "support", "member", "viewer"],
  },
};

export type MatrixOrgNamespace = typeof matrixOrgNamespace.name;
export type MatrixOrgRole = keyof typeof matrixOrgNamespace.relations;
