# GitLab Access Management

This document describes the GitLab-style role and permission management system integrated into the IAM platform.

## Overview

The GitLab Access Management module provides a comprehensive role-based access control (RBAC) system inspired by GitLab's permission model. It leverages Ory Keto for authorization using a Relationship-Based Access Control (ReBAC) approach, following the Zanzibar paper principles.

## Architecture

### Components

1. **Keto Namespaces** (`lib/keto/namespaces/`)
   - `gitlabGroup.ts` - Defines GitLab groups/teams
   - `gitlabProject.ts` - Defines GitLab projects/repositories
   - `user.ts` - User namespace
2. **Service Layer** (`lib/services/gitlab.service.ts`)
   - Business logic for groups, projects, and role assignments
   - Integration with Ory Keto for permission management
3. **API Routes** (`app/api/admin/gitlab/`)
   - RESTful APIs for CRUD operations
   - `/groups` - Manage GitLab groups
   - `/projects` - Manage GitLab projects
   - `/roles` - Manage role assignments
4. **Admin Dashboard** (`app/admin/gitlab/`)
   - UI for managing GitLab access
   - Groups, Projects, and Roles pages

## Roles

The system supports five roles with hierarchical permissions:

| Role           | Description     | Permissions                                        |
| -------------- | --------------- | -------------------------------------------------- |
| **Owner**      | Full control    | Delete, edit, manage members, all project actions  |
| **Maintainer** | Manage resource | Edit settings, manage members, deploy, merge, push |
| **Developer**  | Push code       | Push code, merge, deploy, read repository          |
| **Reporter**   | Read access     | Read repository, read issues                       |
| **Guest**      | Minimal access  | Basic read permissions                             |

## Database Schema

### GitlabGroup

```prisma
model GitlabGroup {
  id          String           @id @default(cuid())
  name        String           @unique
  description String?
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
  projects    GitlabProject[]
}
```

### GitlabProject

```prisma
model GitlabProject {
  id          String        @id @default(cuid())
  name        String        @unique
  description String?
  groupId     String?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  group       GitlabGroup?  @relation(fields: [groupId], references: [id])
}
```

### GitlabRoleAssignment

```prisma
model GitlabRoleAssignment {
  id           String   @id @default(cuid())
  userId       String
  resourceType String   // "group" or "project"
  resourceId   String
  role         String   // "owner", "maintainer", "developer", "reporter", "guest"
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

## Permission Inheritance

Projects can be linked to groups, enabling permission inheritance:

```
GitlabGroup:backend-team#developer@User:alice
GitlabProject:payment-api#parent@GitlabGroup:backend-team

→ Alice has developer access to payment-api through group membership
```

## API Usage

### Create a Group

```bash
POST /api/admin/gitlab/groups
Content-Type: application/json

{
  "name": "backend-team",
  "description": "Backend development team"
}
```

### Create a Project

```bash
POST /api/admin/gitlab/projects
Content-Type: application/json

{
  "name": "payment-api",
  "description": "Payment processing API",
  "groupId": "backend-team-id"  // Optional
}
```

### Assign a Role

```bash
POST /api/admin/gitlab/roles
Content-Type: application/json

{
  "userId": "user-id",
  "resourceType": "project",
  "resourceId": "payment-api-id",
  "role": "developer"
}
```

### Update a Role

```bash
PUT /api/admin/gitlab/roles
Content-Type: application/json

{
  "userId": "user-id",
  "resourceType": "project",
  "resourceId": "payment-api-id",
  "newRole": "maintainer"
}
```

### Remove a Role

```bash
DELETE /api/admin/gitlab/roles
Content-Type: application/json

{
  "userId": "user-id",
  "resourceType": "project",
  "resourceId": "payment-api-id"
}
```

### Check Permission

```typescript
import { checkGitlabPermission } from "@/lib/services/gitlab.service";

const canPush = await checkGitlabPermission(
  userId,
  "project",
  projectId,
  "push_code",
);
```

## Keto Relationships

The system creates the following relationship tuples in Keto:

### Direct Role Assignment

```
GitlabProject:payment-api#developer@User:alice
```

### Group Membership

```
GitlabGroup:backend-team#maintainer@User:bob
```

### Project-Group Link

```
GitlabProject:payment-api#parent@GitlabGroup:backend-team
```

## Admin Dashboard

Access the GitLab management interface at:

- `/admin/gitlab` - Overview page
- `/admin/gitlab/groups` - Manage groups
- `/admin/gitlab/projects` - Manage projects
- `/admin/gitlab/roles` - Assign roles

## Security Considerations

1. **Zero-Trust**: All permission checks go through Keto
2. **Fail Closed**: Permission checks deny by default on errors
3. **Audit Trail**: All role assignments are logged with timestamps
4. **Admin Only**: Only global admins can manage GitLab access

## Permission Check Examples

### Project-Level Permissions

```typescript
// Check if user can push code to a project
const canPush = await checkGitlabPermission(
  userId,
  "project",
  projectId,
  "push_code",
);

// Check if user can manage project members
const canManage = await checkGitlabPermission(
  userId,
  "project",
  projectId,
  "manage_members",
);
```

### Group-Level Permissions

```typescript
// Check if user can view a group
const canView = await checkGitlabPermission(userId, "group", groupId, "view");

// Check if user can add projects to group
const canAddProjects = await checkGitlabPermission(
  userId,
  "group",
  groupId,
  "add_projects",
);
```

## Service Layer API

### Groups

```typescript
// Create a group
const group = await createGitlabGroup({
  name: "backend-team",
  description: "Backend developers",
});

// Get all groups
const groups = await getGitlabGroups();

// Get group with members
const groupDetails = await getGitlabGroupWithMembers(groupId);

// Delete group
await deleteGitlabGroup(groupId);
```

### Projects

```typescript
// Create a project
const project = await createGitlabProject({
  name: "payment-api",
  description: "Payment API",
  groupId: "group-id", // Optional
});

// Get all projects
const projects = await getGitlabProjects();

// Get project with members
const projectDetails = await getGitlabProjectWithMembers(projectId);

// Delete project
await deleteGitlabProject(projectId);
```

### Role Assignments

```typescript
// Assign role
const assignment = await assignGitlabRole({
  userId: "user-id",
  resourceType: "project",
  resourceId: "project-id",
  role: "developer",
});

// Update role
await updateGitlabRole({
  userId: "user-id",
  resourceType: "project",
  resourceId: "project-id",
  newRole: "maintainer",
});

// Remove role
await removeGitlabRole({
  userId: "user-id",
  resourceType: "project",
  resourceId: "project-id",
});

// Get resource members
const members = await getResourceMembers("project", projectId);

// Get user's roles
const userRoles = await getUserGitlabRoles(userId);
```

## Future Enhancements

Potential improvements to consider:

1. **Role Inheritance** - Implement role hierarchy (owner > maintainer > developer)
2. **Bulk Operations** - Assign roles to multiple users at once
3. **Audit Logs** - Detailed activity logs for compliance
4. **Permission Preview** - Show what permissions a user will have before assignment
5. **User Search** - Search and autocomplete when assigning roles
6. **Webhooks** - Notify external systems of role changes
7. **Time-based Access** - Temporary role assignments with expiration
8. **Custom Roles** - Allow defining custom roles beyond the five defaults

## Troubleshooting

### Permission Checks Failing

- Ensure Keto is running and accessible
- Check Keto logs for relationship tuple errors
- Verify the migration has been applied

### TypeScript Errors

- Run `npx prisma generate` to regenerate Prisma client
- Restart TypeScript server in VS Code

### Database Issues

- Ensure PostgreSQL is running
- Check DATABASE_URL in .env
- Run `npx prisma migrate dev` to apply migrations

## References

- [Ory Keto Documentation](https://www.ory.sh/docs/keto)
- [Google Zanzibar Paper](https://research.google/pubs/pub48190/)
- [GitLab Permissions](https://docs.gitlab.com/ee/user/permissions.html)
