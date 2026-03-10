/**
 * Keto Namespaces Export
 * Central export for all namespace definitions
 */

export * from "./user";
export * from "./gitlabGroup";
export * from "./gitlabProject";

// Role mappings for validation
export const GITLAB_ROLES = [
  "owner",
  "maintainer",
  "developer",
  "reporter",
  "guest",
] as const;
export type GitlabRole = (typeof GITLAB_ROLES)[number];

export function isValidGitlabRole(role: string): role is GitlabRole {
  return GITLAB_ROLES.includes(role as GitlabRole);
}

// Resource type mappings
export const GITLAB_RESOURCE_TYPES = ["group", "project"] as const;
export type GitlabResourceType = (typeof GITLAB_RESOURCE_TYPES)[number];

export function isValidResourceType(type: string): type is GitlabResourceType {
  return GITLAB_RESOURCE_TYPES.includes(type as GitlabResourceType);
}
