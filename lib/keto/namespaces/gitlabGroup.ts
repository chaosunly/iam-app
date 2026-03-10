/**
 * GitLab Group Namespace for Keto
 * Represents GitLab groups/teams with hierarchical permissions
 *
 * Relations:
 * - owner: Can manage group, add/remove members, delete group
 * - maintainer: Can manage group members
 * - developer: Can view group
 * - reporter: Can view group (read-only)
 * - guest: Minimal access
 * - member: Any user with any role in the group
 *
 * Example:
 * GitlabGroup:backend-team#owner@User:alice
 * GitlabGroup:backend-team#developer@User:bob
 */

export const gitlabGroupNamespace = {
  name: "GitlabGroup",

  relations: {
    owner: "owner",
    maintainer: "maintainer",
    developer: "developer",
    reporter: "reporter",
    guest: "guest",
    member: "member", // Computed: any role
  },

  permissions: {
    // Group management
    delete: "owner",
    edit: "owner",
    manage_members: ["owner", "maintainer"],
    add_projects: ["owner", "maintainer"],

    // View permissions
    view: ["owner", "maintainer", "developer", "reporter", "guest"],
  },
};

export type GitlabGroupNamespace = typeof gitlabGroupNamespace.name;
export type GitlabGroupRole = keyof typeof gitlabGroupNamespace.relations;
