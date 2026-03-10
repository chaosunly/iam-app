Project Feature: GitLab Roles & Permissions Module for IAM Platform
Authorization Engine: Ory Keto
Reference System: GitLab style roles and permissions
Authorization Model: Inspired by Google Zanzibar

⸻

1. Your Role

You are a senior backend and system architect responsible for implementing a GitLab-style role and permission management system inside an IAM Admin Dashboard.

You must design:
• Authorization schema
• Backend APIs
• Dashboard integration
• Ory Keto relationship management

Your solution must be scalable, maintainable, and follow ReBAC best practices.

⸻

2. System Context

The IAM platform already includes:

Authentication
• Ory Kratos

Authorization
• Ory Keto

Admin Interface
• IAM Admin Dashboard

Backend
• Node.js / TypeScript API server

The new module should allow administrators to manage GitLab-style roles and permissions for projects and groups.

⸻

3. Goal of the Feature

Create a GitLab Access Management module inside the IAM dashboard where administrators can: 1. Create GitLab groups 2. Create GitLab projects 3. Link projects to groups 4. Assign roles to users 5. Update user roles 6. Remove user roles 7. View members and roles 8. Check permissions through Keto

⸻

4. Supported Roles

The system must support the following roles:

Role Description
guest minimal read access
reporter read repository
developer push code
maintainer manage project
owner manage group 5. Authorization Architecture

Use Relationship-Based Access Control (ReBAC).

The relationship graph must follow:

User → Role → Resource

Resources:

Group
Project

Relationship types:

User --role--> Project
User --role--> Group
Project --parent--> Group

This architecture should allow permission inheritance from groups to projects.

6. Ory Keto Namespace Design

Create the following namespace files:

keto/namespaces/

Required files:

user.ts
gitlabGroup.ts
gitlabProject.ts
role.ts
roleBinding.ts

Each namespace must:

follow the Keto TypeScript namespace system

define relationships

define permission checks

Example relationship:

GitlabProject:payment-api#developer@User:alice

Example inheritance:

GitlabGroup:backend-team#developer@User:alice
GitlabProject:payment-api#parent@GitlabGroup:backend-team 7. Backend API Requirements

Implement REST APIs.

Create GitLab Group
POST /iam/gitlab/groups

Request

{
"name": "backend-team"
}
Create GitLab Project
POST /iam/gitlab/projects

Request

{
"name": "payment-api",
"groupId": "backend-team"
}
Assign Role
POST /iam/gitlab/roles

Request

{
"userId": "alice",
"resourceType": "project",
"resourceId": "payment-api",
"role": "developer"
}

Agent must:

Validate role

Write relation to Keto

Update Role
PUT /iam/gitlab/roles

Steps:

remove old relation

create new relation

Remove Role
DELETE /iam/gitlab/roles

Request

{
"userId": "alice",
"resourceId": "payment-api"
} 8. IAM Admin Dashboard Requirements

Add a new section:

GitLab Access

Structure:

IAM Dashboard
└ GitLab Access
├ Groups
├ Projects
└ Roles
Groups Page

Features:

create group

list groups

add members

Projects Page

Features:

create project

connect to group

list members

Roles Page

Admin can:

assign role

update role

remove role

Example table:

## User Project Role

alice payment-api developer
bob payment-api reporter 9. Permission Check Integration

Permission checks must be performed through Keto.

Example:

Check if user can push code.

subject: User:alice
relation: push_code
object: GitlabProject:payment-api 10. Keto Integration

Use Keto Write API to manage relationships.

Example request:

POST /relation-tuples

Body

{
"namespace": "GitlabProject",
"object": "payment-api",
"relation": "developer",
"subject_id": "alice"
} 11. Folder Structure

Expected structure:

backend/
controllers/gitlab
services/gitlab
routes/gitlab

frontend/
pages/gitlab-access
components/gitlab-groups
components/gitlab-projects
components/gitlab-roles

keto/
namespaces/ 12. Development Rules

The agent must:

use TypeScript

follow clean architecture

keep namespaces modular

separate service layer and controller layer

validate inputs

prevent duplicate role assignments

implement proper error handling

13. Output Required

The agent must generate:

Keto namespace files

Backend APIs

Keto integration service

IAM dashboard pages

Role assignment UI

Permission check examples

14. Optional Advanced Features

If possible, implement:

role inheritance

audit logs

bulk role assignment

permission preview

search users when assigning roles

15. Execution Strategy

The agent must follow this order:

1️⃣ Design authorization schema
2️⃣ Implement Keto namespaces
3️⃣ Build backend APIs
4️⃣ Integrate Keto write operations
5️⃣ Build dashboard UI
6️⃣ Implement permission checks
