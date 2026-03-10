/**
 * GitLab Project Namespace for Keto
 * Represents GitLab projects/repositories with role-based access
 *
 * Relations:
 * - owner: Full control over project
 * - maintainer: Can manage project settings and members
 * - developer: Can push code, merge, deploy
 * - reporter: Can read repository, issues
 * - guest: Minimal read access
 * - parent: Link to parent GitlabGroup (for inheritance)
 *
 * Permission Inheritance:
 * Users with roles in parent group inherit equivalent access to projects
 *
 * Example:
 * GitlabProject:payment-api#developer@User:alice
 * GitlabProject:payment-api#parent@GitlabGroup:backend-team
 * GitlabGroup:backend-team#developer@User:bob
 * -> Bob inherits developer access to payment-api
 */

export const gitlabProjectNamespace = {
  name: "GitlabProject",

  relations: {
    owner: "owner",
    maintainer: "maintainer",
    developer: "developer",
    reporter: "reporter",
    guest: "guest",
    parent: "parent", // Link to GitlabGroup for inheritance
  },

  permissions: {
    // Write permissions
    push_code: ["owner", "maintainer", "developer"],
    merge: ["owner", "maintainer", "developer"],
    deploy: ["owner", "maintainer", "developer"],

    // Management permissions
    delete: "owner",
    edit_settings: ["owner", "maintainer"],
    manage_members: ["owner", "maintainer"],

    // Read permissions
    read_repository: ["owner", "maintainer", "developer", "reporter", "guest"],
    read_issues: ["owner", "maintainer", "developer", "reporter", "guest"],

    // View (basic read)
    view: ["owner", "maintainer", "developer", "reporter", "guest"],
  },
};

export type GitlabProjectNamespace = typeof gitlabProjectNamespace.name;
export type GitlabProjectRole =
  | "owner"
  | "maintainer"
  | "developer"
  | "reporter"
  | "guest";
