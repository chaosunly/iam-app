/**
 * Global Role Namespace for Keto
 * Represents platform-wide roles that are not scoped to an organization.
 */

export const globalRoleNamespace = {
  name: "GlobalRole",

  relations: {
    members: "members",
  },

  permissions: {
    is_admin: ["members"],
  },
};

export type GlobalRoleNamespace = typeof globalRoleNamespace.name;
