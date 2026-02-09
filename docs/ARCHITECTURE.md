# IAM App - BFF + Zero-Trust Architecture

## 🏗️ Architecture Overview

This application implements a **Backend-For-Frontend (BFF)** pattern with **Zero-Trust IAM Architecture** using:

- **Next.js 16** - Full-stack React framework
- **Ory Kratos** - Identity & User Management (Authentication)
- **Ory Keto** - Authorization (Permissions based on Zanzibar)
- **BFF Layer** - Service abstraction between UI and IAM services

## 🔐 Zero-Trust Security Model

### Core Principles

1. **Never Trust, Always Verify**: Every request is authenticated and authorized
2. **Least Privilege Access**: Users get minimum permissions needed
3. **Explicit Verification**: Permissions checked at every layer
4. **Fail Closed**: Deny by default if verification fails

### Implementation Layers

```
┌─────────────────────────────────────────┐
│          User Interface (UI)            │
│        Next.js Pages & Components       │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│       Edge Middleware (Route Guard)     │
│     Basic session check & redirect      │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│        API Routes (BFF Layer)           │
│   - Auth Middleware (Zero-Trust)        │
│   - Permission Checks                   │
│   - Request/Response Handling           │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         Service Layer (BFF)             │
│   - Kratos Service (Identity)           │
│   - Keto Service (Permissions)          │
│   - Business Logic                      │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│       Backend IAM Services              │
│   - Ory Kratos (Authentication)         │
│   - Ory Keto (Authorization)            │
└─────────────────────────────────────────┘
```

## 📁 Project Structure

```
iam-app/
├── app/                          # Next.js App Router
│   ├── api/                      # BFF API Routes
│   │   ├── admin/                # Admin-only endpoints
│   │   │   ├── identities/       # Identity management
│   │   │   └── permissions/      # Permission management
│   │   └── auth/                 # Auth endpoints
│   ├── admin/                    # Admin UI pages
│   ├── auth/                     # Auth UI pages
│   └── dashboard/                # User dashboard
│
├── lib/                          # Core libraries
│   ├── middleware/               # Auth & permission middleware
│   │   └── auth.middleware.ts    # Zero-Trust auth functions
│   ├── services/                 # BFF Service Layer
│   │   ├── kratos.service.ts     # Identity management
│   │   └── keto.service.ts       # Authorization management
│   ├── types/                    # TypeScript types
│   │   └── api.ts                # API contracts
│   ├── errors.ts                 # Error handling utilities
│   └── utils.ts                  # Utility functions
│
├── middleware.ts                 # Next.js Edge Middleware
├── ory.config.ts                 # Ory configuration
└── next.config.ts                # Next.js configuration
```

## 🔧 Key Components

### 1. Edge Middleware (`middleware.ts`)

- Runs on Cloudflare Edge (or Vercel Edge)
- Performs basic session checks
- Redirects unauthenticated users to login
- **Does NOT enforce permissions** (Zero-Trust: verify at API layer)

```typescript
// Public routes allowed
const PUBLIC_ROUTES = [/^\/auth\//, /^\/$/];

// Protected routes require session
const PROTECTED_ROUTES = [/^\/admin/, /^\/dashboard/];
```

### 2. Auth Middleware (`lib/middleware/auth.middleware.ts`)

Zero-Trust authentication and authorization functions:

- `requireAuth()` - Verify user session
- `requirePermission()` - Check specific permission
- `requireAdmin()` - Combined auth + admin permission check
- `requireAnyPermission()` - Check OR permissions
- `requireAllPermissions()` - Check AND permissions

**Usage Example:**

```typescript
import { requireAdmin } from "@/lib/middleware/auth.middleware";

export async function GET(request: NextRequest) {
  // Zero-Trust: Always verify at the start
  const userContext = await requireAdmin(request);

  // Now we know user is authenticated AND authorized
  // ... your logic here
}
```

### 3. Service Layer (BFF)

#### Kratos Service (`lib/services/kratos.service.ts`)

Handles all identity operations:

- `listIdentities()` - Get all identities
- `getIdentity(id)` - Get specific identity
- `createIdentity(data)` - Create new identity
- `updateIdentity(id, data)` - Update identity
- `deleteIdentity(id)` - Delete identity
- `searchIdentities(term)` - Search identities

#### Keto Service (`lib/services/keto.service.ts`)

Handles all permission operations:

- `checkPermission(tuple)` - Verify permission (Zero-Trust)
- `grantPermission(tuple)` - Grant permission
- `revokePermission(tuple)` - Revoke permission
- `listUserPermissions(userId)` - Get user's permissions
- `listObjectPermissions(namespace, object)` - Get object permissions
- `hasAnyRole(userId, roles)` - Check for any role
- `hasAllRoles(userId, roles)` - Check for all roles

### 4. Error Handling (`lib/errors.ts`)

Custom error classes with HTTP status codes:

- `UnauthorizedError` (401) - Not authenticated
- `ForbiddenError` (403) - Not authorized
- `NotFoundError` (404) - Resource not found
- `BadRequestError` (400) - Invalid request
- `InternalServerError` (500) - Server error

**Response Builders:**

- `createSuccessResponse(data, status)` - Success response
- `createErrorResponse(error)` - Error response
- `withErrorHandler(handler)` - Async error wrapper

## 🛡️ Security Best Practices

### 1. Always Authenticate First

```typescript
// ✅ GOOD: Zero-Trust
export async function GET(request: NextRequest) {
  const userContext = await requireAuth(request);
  // ... rest of logic
}

// ❌ BAD: Trusting the request
export async function GET(request: NextRequest) {
  const userId = request.headers.get("user-id"); // Never trust headers!
}
```

### 2. Check Permissions Explicitly

```typescript
// ✅ GOOD: Explicit permission check
await requirePermission(userContext, {
  namespace: "Document",
  object: documentId,
  relation: "editor",
});

// ❌ BAD: Assuming permissions
if (userContext.userId === ownerId) {
  // Don't rely on simple checks
  // This bypasses your permission system!
}
```

### 3. Fail Closed

```typescript
// ✅ GOOD: Deny by default
const hasPermission = await checkPermission(tuple);
if (!hasPermission) {
  throw new ForbiddenError();
}

// ❌ BAD: Fail open
try {
  await checkPermission(tuple);
} catch {
  // Allowing on error!
}
```

### 4. Use Service Layer

```typescript
// ✅ GOOD: Use service layer (BFF)
import { getIdentity } from "@/lib/services/kratos.service";
const identity = await getIdentity(id);

// ❌ BAD: Direct API calls in routes
const response = await fetch(`${KRATOS_URL}/identities/${id}`);
```

## 🚀 API Route Pattern

Every API route should follow this pattern:

```typescript
import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/middleware/auth.middleware";
import { someService } from "@/lib/services/some.service";
import { createSuccessResponse, withErrorHandler } from "@/lib/errors";

export async function GET(request: NextRequest) {
  return withErrorHandler(async () => {
    // 1️⃣ AUTHENTICATION & AUTHORIZATION (Zero-Trust)
    const userContext = await requireAdmin(request);

    // 2️⃣ EXTRACT & VALIDATE INPUT
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    // 3️⃣ CALL SERVICE LAYER (BFF)
    const data = await someService.getData(id);

    // 4️⃣ RETURN SUCCESS RESPONSE
    return createSuccessResponse(data);
  });
}
```

## 🔑 Permission Model (Zanzibar-style)

### Relation Tuples

Permissions are stored as tuples:

```typescript
{
  namespace: "GlobalRole",  // Permission namespace
  object: "admin",          // Role/Resource
  relation: "is_admin",     // Relationship type
  subject: "user-id-123"    // Who has the permission
}
```

### Examples

#### Grant Admin Access

```typescript
await grantPermission({
  namespace: "GlobalRole",
  object: "admin",
  relation: "is_admin",
  subject: userId,
});
```

#### Check Document Edit Permission

```typescript
const canEdit = await checkPermission({
  namespace: "Document",
  object: documentId,
  relation: "editor",
  subject: userId,
});
```

#### Hierarchical Permissions

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
  subject: `Team:${teamId}#member`, // Indirect relation
});
```

## 📝 Environment Variables

Create a `.env.local` file:

```bash
# Ory Kratos (Identity Management)
ORY_KRATOS_PUBLIC_URL=http://localhost:4433
ORY_KRATOS_ADMIN_URL=http://localhost:4434

# Ory Keto (Authorization)
ORY_KETO_READ_URL=http://localhost:4466
ORY_KETO_WRITE_URL=http://localhost:4467

# Next.js
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🧪 Testing Recommendations

### 1. Test Authentication

```typescript
// Verify unauthenticated requests are rejected
const response = await fetch("/api/admin/identities");
expect(response.status).toBe(401);
```

### 2. Test Authorization

```typescript
// Verify unauthorized users are rejected
const response = await authenticatedFetch("/api/admin/identities", {
  user: regularUser,
});
expect(response.status).toBe(403);
```

### 3. Test Permission Changes

```typescript
// Grant permission, verify access, revoke, verify denial
await grantPermission(tuple);
expect(await checkPermission(tuple)).toBe(true);

await revokePermission(tuple);
expect(await checkPermission(tuple)).toBe(false);
```

## 📚 Additional Resources

- [Ory Kratos Documentation](https://www.ory.sh/docs/kratos)
- [Ory Keto Documentation](https://www.ory.sh/docs/keto)
- [Google Zanzibar Paper](https://research.google/pubs/pub48190/)
- [Zero Trust Architecture (NIST)](https://www.nist.gov/publications/zero-trust-architecture)
- [BFF Pattern](https://samnewman.io/patterns/architectural/bff/)

## 🤝 Contributing

When adding new features:

1. ✅ Always use Zero-Trust principles
2. ✅ Implement in service layer first
3. ✅ Use middleware for auth/authz
4. ✅ Handle errors with custom classes
5. ✅ Follow the established patterns
6. ✅ Add proper TypeScript types

## 🎯 Quick Start Checklist

- [ ] Ory Kratos running on port 4433/4434
- [ ] Ory Keto running on port 4466/4467
- [ ] Environment variables configured
- [ ] Dependencies installed (`npm install`)
- [ ] Database migrations run (Kratos & Keto)
- [ ] Admin user created and permissions granted
- [ ] Development server running (`npm run dev`)

## 🔄 Common Workflows

### Creating an Admin User

```bash
# 1. Create identity via Kratos
curl -X POST http://localhost:4434/admin/identities \
  -H "Content-Type: application/json" \
  -d '{
    "schema_id": "default",
    "traits": {
      "email": "admin@example.com"
    }
  }'

# 2. Grant admin permission via Keto
curl -X PUT http://localhost:4467/admin/relation-tuples \
  -H "Content-Type: application/json" \
  -d '{
    "namespace": "GlobalRole",
    "object": "admin",
    "relation": "is_admin",
    "subject_id": "<user-id-from-step-1>"
  }'
```

### Adding New Protected Routes

1. Add middleware check in `middleware.ts` (optional for session)
2. Create API route in `app/api/`
3. Use `requireAuth()` or `requirePermission()` at route level
4. Call service layer for business logic
5. Return standardized responses

---

**Built with ❤️ using BFF + Zero-Trust Architecture**
