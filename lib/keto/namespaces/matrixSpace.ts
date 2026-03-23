/**
 * Matrix Space Namespace for Keto
 * Represents a Matrix Space (a collection of rooms) within an org
 *
 * Relations:
 * - matrix_admin: Full control within this space
 * - moderator:    Can manage rooms and users in this space
 * - support:      Impersonate users, view audit within this space
 * - member:       Regular participant
 * - viewer:       Read-only
 * - parent:       Link to MatrixOrg for role inheritance
 *
 * Permission Inheritance:
 * Users with roles in the parent MatrixOrg inherit equivalent access to spaces.
 *
 * Example tuples:
 * MatrixSpace:engineering#parent@MatrixOrg:acme-corp
 * MatrixSpace:engineering#moderator@User:cl9jkl012
 */

export const matrixSpaceNamespace = {
  name: "MatrixSpace",

  relations: {
    matrix_admin: "matrix_admin",
    moderator:    "moderator",
    support:      "support",
    member:       "member",
    viewer:       "viewer",
    parent:       "parent", // Link to MatrixOrg for inheritance
  },

  permissions: {
    manage_users:         ["matrix_admin", "moderator"],
    manage_roles:         ["matrix_admin"],
    manage_spaces:        ["matrix_admin"],
    manage_rooms:         ["matrix_admin", "moderator"],
    view_audit:           ["matrix_admin", "moderator", "support"],
    impersonate_support:  ["support"],
    view_content:         ["matrix_admin", "moderator", "support", "member", "viewer"],
  },
};

export type MatrixSpaceNamespace = typeof matrixSpaceNamespace.name;
export type MatrixSpaceRole = Exclude<keyof typeof matrixSpaceNamespace.relations, "parent">;
