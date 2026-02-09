# Quick Reference Guide

## 🚀 Common Tasks

### Adding a New Protected API Route

```typescript
// app/api/your-feature/route.ts
import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/middleware/auth.middleware";
import { createSuccessResponse, withErrorHandler } from "@/lib/errors";

export async function GET(request: NextRequest) {
  return withErrorHandler(async () => {
    // 1. Authenticate
    const userContext = await requireAuth(request);

    // 2. Authorize (optional)
    await requirePermission(userContext, {
      namespace: "Resource",
      object: "resourceId",
      relation: "viewer",
    });

    // 3. Business logic
    const data = await yourService.getData();

    // 4. Response
    return createSuccessResponse(data);
  });
}
```

### Creating a Service

```typescript
// lib/services/your.service.ts
import { InternalServerError, NotFoundError } from "@/lib/errors";

const SERVICE_URL = process.env.YOUR_SERVICE_URL;

export async function getData(id: string): Promise<YourType> {
  try {
    const response = await fetch(`${SERVICE_URL}/data/${id}`);

    if (response.status === 404) {
      throw new NotFoundError("Data not found");
    }

    if (!response.ok) {
      throw new InternalServerError("Failed to fetch data");
    }

    return await response.json();
  } catch (error) {
    if (
      error instanceof NotFoundError ||
      error instanceof InternalServerError
    ) {
      throw error;
    }
    throw new InternalServerError("Service error");
  }
}
```

### Grant Permission

```typescript
import { grantPermission } from "@/lib/services/keto.service";

await grantPermission({
  namespace: "Document",
  object: documentId,
  relation: "editor",
  subject: userId,
});
```

### Check Permission

```typescript
import { checkPermission } from "@/lib/services/keto.service";

const hasAccess = await checkPermission({
  namespace: "Document",
  object: documentId,
  relation: "viewer",
  subject: userId,
});

if (!hasAccess) {
  throw new ForbiddenError("Access denied");
}
```

### Revoke Permission

```typescript
import { revokePermission } from "@/lib/services/keto.service";

await revokePermission({
  namespace: "Document",
  object: documentId,
  relation: "editor",
  subject: userId,
});
```

## 📝 TypeScript Types

### Adding API Types

```typescript
// lib/types/api.ts

export interface YourResource {
  id: string;
  name: string;
  createdAt: string;
}

export interface CreateYourResourceRequest {
  name: string;
  description?: string;
}
```

## 🔐 Auth Patterns

### Basic Auth

```typescript
const userContext = await requireAuth(request);
// userContext.userId
// userContext.identity
// userContext.sessionId
```

### Admin Only

```typescript
const userContext = await requireAdmin(request);
// Verified admin user
```

### Custom Permission

```typescript
const userContext = await requireAuth(request);

await requirePermission(userContext, {
  namespace: "YourNamespace",
  object: "resource-id",
  relation: "action",
});
```

### Multiple Permissions (OR)

```typescript
await requireAnyPermission(userContext, [
  { namespace: "Doc", object: id, relation: "editor" },
  { namespace: "Doc", object: id, relation: "owner" },
]);
```

### Multiple Permissions (AND)

```typescript
await requireAllPermissions(userContext, [
  { namespace: "Feature", object: "analytics", relation: "viewer" },
  { namespace: "Feature", object: "exports", relation: "user" },
]);
```

## 🚨 Error Handling

### Throwing Errors

```typescript
import {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  BadRequestError,
} from "@/lib/errors";

// 401 - No auth
throw new UnauthorizedError("Login required");

// 403 - No permission
throw new ForbiddenError("Admin access required");

// 404 - Not found
throw new NotFoundError("User not found");

// 400 - Bad input
throw new BadRequestError("Email is required");
```

### Error Wrapper

```typescript
export async function GET(request: NextRequest) {
  return withErrorHandler(async () => {
    // Your code
    // Errors automatically caught and formatted
  });
}
```

## 🔍 Debugging

### Check Session

```typescript
import { getServerSession } from "@ory/nextjs/app";
import config from "@/ory.config";

const session = await getServerSession(config);
console.log("Session:", session);
```

### List User Permissions

```typescript
import { listUserPermissions } from "@/lib/services/keto.service";

const permissions = await listUserPermissions(userId);
console.log("Permissions:", permissions);
```

### Test Permission

```bash
# Check permission via Keto API
curl -X POST http://localhost:4466/relation-tuples/check \
  -H "Content-Type: application/json" \
  -d '{
    "namespace": "GlobalRole",
    "object": "admin",
    "relation": "is_admin",
    "subject_id": "<user-id>"
  }'
```

## 📊 Common Permission Patterns

### Role-Based

```typescript
// Grant role
await grantPermission({
  namespace: "GlobalRole",
  object: "admin",
  relation: "is_admin",
  subject: userId,
});

// Check role
const isAdmin = await checkPermission({
  namespace: "GlobalRole",
  object: "admin",
  relation: "is_admin",
  subject: userId,
});
```

### Resource-Based

```typescript
// Grant resource access
await grantPermission({
  namespace: "Document",
  object: documentId,
  relation: "editor",
  subject: userId,
});

// Check resource access
const canEdit = await checkPermission({
  namespace: "Document",
  object: documentId,
  relation: "editor",
  subject: userId,
});
```

### Team-Based

```typescript
// User is member of team
await grantPermission({
  namespace: "Team",
  object: teamId,
  relation: "member",
  subject: userId,
});

// Team has access to project
await grantPermission({
  namespace: "Project",
  object: projectId,
  relation: "viewer",
  subject: `Team:${teamId}#member`,
});

// Check project access (resolves through team)
const canView = await checkPermission({
  namespace: "Project",
  object: projectId,
  relation: "viewer",
  subject: userId,
});
```

## 🛠️ CLI Commands

### Create Identity

```bash
curl -X POST http://localhost:4434/admin/identities \
  -H "Content-Type: application/json" \
  -d '{
    "schema_id": "default",
    "traits": {
      "email": "user@example.com",
      "name": "User Name"
    }
  }'
```

### Delete Identity

```bash
curl -X DELETE http://localhost:4434/admin/identities/<identity-id>
```

### List Relation Tuples

```bash
curl http://localhost:4466/relation-tuples?namespace=GlobalRole
```

### Create Relation Tuple

```bash
curl -X PUT http://localhost:4467/admin/relation-tuples \
  -H "Content-Type: application/json" \
  -d '{
    "namespace": "GlobalRole",
    "object": "admin",
    "relation": "is_admin",
    "subject_id": "<user-id>"
  }'
```

### Delete Relation Tuple

```bash
curl -X DELETE "http://localhost:4467/admin/relation-tuples?\
namespace=GlobalRole&\
object=admin&\
relation=is_admin&\
subject_id.id=<user-id>"
```

## 📦 Environment Setup

### Development

```bash
# Install
npm install

# Start Ory services
docker-compose up -d

# Run migrations (if needed)
# ...

# Start dev server
npm run dev
```

### Quick Docker Setup

```bash
# Kratos
docker run -d --name kratos \
  -p 4433:4433 -p 4434:4434 \
  oryd/kratos:latest serve --dev

# Keto
docker run -d --name keto \
  -p 4466:4466 -p 4467:4467 \
  oryd/keto:latest serve --dev
```

## 🧪 Testing Checklist

- [ ] Unauthenticated request returns 401
- [ ] Unauthorized user returns 403
- [ ] Authorized user succeeds (200)
- [ ] Permission revoked → access denied
- [ ] Invalid input returns 400
- [ ] Not found returns 404
- [ ] Server error returns 500

## 🔗 Useful Links

- Kratos Admin: http://localhost:4434
- Keto Read: http://localhost:4466
- Keto Write: http://localhost:4467
- App: http://localhost:3000

## 💡 Tips

1. **Always authenticate first** before authorization
2. **Use service layer** instead of direct API calls
3. **Fail closed** - deny by default
4. **Log access attempts** for audit trail
5. **Validate all inputs** at service layer
6. **Return proper errors** with correct status codes
7. **Keep permissions granular** - one action per permission
8. **Document permission model** in your README

## 🐛 Common Issues

### "Session not found"

- Check cookies are being sent
- Verify Kratos is running
- Check CORS settings

### "Permission denied"

- Verify relation tuple exists in Keto
- Check namespace/object/relation match
- Use Keto API to list tuples

### "Type errors"

- Import types from `@/lib/types`
- Check return types match interfaces
- Run `npm run type-check`

### "Service unavailable"

- Check Docker containers are running
- Verify environment variables
- Check network connectivity

## 📚 More Resources

- [Architecture Guide](./ARCHITECTURE.md)
- [BFF Pattern](./BFF-PATTERN.md)
- [Zero Trust Guide](./ZERO-TRUST.md)
