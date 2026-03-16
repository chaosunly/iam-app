/**
 * Organization Namespace for Keto
 * Represents tenant-level org membership and management permissions.
 */

export const organizationNamespace = {
  name: "Organization",

  relations: {
    owners: "owners",
    admins: "admins",
    members: "members",
    viewers: "viewers",
  },

  permissions: {
    manage_org: ["owners"],
    manage_users: ["owners", "admins"],
    manage_groups: ["owners", "admins"],
    manage_roles: ["owners", "admins"],
    invite_member: ["owners", "admins"],
    remove_member: ["owners", "admins"],
    create_group: ["owners", "admins"],
    view_org: ["owners", "admins", "members", "viewers"],
    is_member: ["owners", "admins", "members", "viewers"],
  },
};

export type OrganizationNamespace = typeof organizationNamespace.name;
export type OrganizationRole = keyof typeof organizationNamespace.relations;
