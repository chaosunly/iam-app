/**
 * Keto Namespaces Export
 * Central export for all namespace definitions
 */

export * from "./user";
export * from "./globalRole";
export * from "./organization";
export * from "./group";
export * from "./gitlabGroup";
export * from "./gitlabProject";
export * from "./matrixOrg";
export * from "./matrixSpace";
export * from "./matrixRoom";

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

// Matrix role and resource type mappings
export const MATRIX_ROLES = [
  "matrix_admin",
  "moderator",
  "support",
  "member",
  "viewer",
] as const;
export type MatrixRole = (typeof MATRIX_ROLES)[number];

export function isValidMatrixRole(role: string): role is MatrixRole {
  return MATRIX_ROLES.includes(role as MatrixRole);
}

export const MATRIX_RESOURCE_TYPES = ["org", "space", "room"] as const;
export type MatrixResourceType = (typeof MATRIX_RESOURCE_TYPES)[number];

export function isValidMatrixResourceType(type: string): type is MatrixResourceType {
  return MATRIX_RESOURCE_TYPES.includes(type as MatrixResourceType);
}

// Matrix namespace name map (resourceType → Keto namespace)
export const MATRIX_NAMESPACE_MAP: Record<MatrixResourceType, string> = {
  org:   "MatrixOrg",
  space: "MatrixSpace",
  room:  "MatrixRoom",
};
