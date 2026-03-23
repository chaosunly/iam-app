/**
 * Matrix Room Namespace for Keto
 * Represents an individual Matrix room within a space
 *
 * Relations:
 * - matrix_admin: Full control within this room
 * - moderator:    Can manage room settings and users
 * - support:      Impersonate users, view audit within this room
 * - member:       Regular participant
 * - viewer:       Read-only presence
 * - parent:       Link to MatrixSpace for role inheritance
 *
 * Permission Inheritance:
 * Users with roles in the parent MatrixSpace inherit equivalent access to rooms.
 *
 * Example tuples:
 * MatrixRoom:general#parent@MatrixSpace:engineering
 * MatrixRoom:incident-response#moderator@User:cl9ghi789
 */

export const matrixRoomNamespace = {
  name: "MatrixRoom",

  relations: {
    matrix_admin: "matrix_admin",
    moderator:    "moderator",
    support:      "support",
    member:       "member",
    viewer:       "viewer",
    parent:       "parent", // Link to MatrixSpace for inheritance
  },

  permissions: {
    manage_rooms:         ["matrix_admin", "moderator"],
    manage_users:         ["matrix_admin", "moderator"],
    view_audit:           ["matrix_admin", "moderator", "support"],
    impersonate_support:  ["support"],
    view_content:         ["matrix_admin", "moderator", "support", "member", "viewer"],
  },
};

export type MatrixRoomNamespace = typeof matrixRoomNamespace.name;
export type MatrixRoomRole = Exclude<keyof typeof matrixRoomNamespace.relations, "parent">;
