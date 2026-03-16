/**
 * Group Namespace for Keto
 * Represents application groups nested under organizations.
 */

export const groupNamespace = {
  name: "Group",

  relations: {
    org: "org", // parent organization id
    admins: "admins",
    members: "members",
  },

  permissions: {
    manage_group: ["admins"],
    add_members: ["admins"],
    remove_members: ["admins"],
    view_group: ["admins", "members"],
    is_member: ["admins", "members"],
  },
};

export type GroupNamespace = typeof groupNamespace.name;
export type GroupRole = keyof typeof groupNamespace.relations;
