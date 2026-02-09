# Zero-Trust IAM Architecture Guide

## 🛡️ What is Zero-Trust?

**Zero-Trust** is a security model based on the principle: **"Never trust, always verify."**

### Traditional Security (Perimeter-Based)

```
                 FIREWALL
    Internet  ║           ║  Internal Network
  (Untrusted) ║  TRUST    ║  (Trusted)
              ║  BOUNDARY ║
              ║═══════════║
                          └─► Once inside, everything trusted
```

**Problem:** If perimeter is breached, attacker has full access.

### Zero-Trust Security

```
Every Request → Authenticate → Authorize → Access Resource
                    ↓              ↓
                Verify ID      Check Permission
                                    ↓
                            Deny by Default
```

**Benefit:** Breach of one component doesn't compromise everything.

## 🎯 Core Principles

### 1. Never Trust, Always Verify

```typescript
// ❌ BAD: Trusting the environment
export async function GET(request: NextRequest) {
  // Assuming user is authenticated because they reached this endpoint
  const data = await getData();
  return NextResponse.json(data);
}

// ✅ GOOD: Always verify
export async function GET(request: NextRequest) {
  // Explicitly verify identity and permissions
  const userContext = await requireAuth(request);
  await requirePermission(userContext, permission);

  const data = await getData();
  return createSuccessResponse(data);
}
```

### 2. Least Privilege Access

Users should have **minimum permissions** needed to do their job.

```typescript
// ❌ BAD: Giving blanket admin access
{
  namespace: "App",
  object: "*",
  relation: "admin",
  subject: userId
}

// ✅ GOOD: Specific permissions only
{
  namespace: "Document",
  object: documentId,
  relation: "editor",
  subject: userId
}
```

### 3. Verify Explicitly

Don't rely on implicit checks or assumptions.

```typescript
// ❌ BAD: Implicit check
if (user.department === "IT") {
  // Assuming IT has admin access
  await deleteUser(id);
}

// ✅ GOOD: Explicit verification
const hasPermission = await checkPermission({
  namespace: "User",
  object: id,
  relation: "deleter",
  subject: user.id,
});

if (!hasPermission) {
  throw new ForbiddenError();
}

await deleteUser(id);
```

### 4. Assume Breach

Design system assuming attackers are already inside.

```typescript
// ✅ Defense in depth
// 1. Edge middleware (basic session check)
// 2. API route middleware (auth + permissions)
// 3. Service layer (validate inputs)
// 4. Backend service (final verification)

// Even if one layer is bypassed, others will catch it
```

## 🔐 Our Zero-Trust Implementation

### Layer 1: Edge Middleware

```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const session = await getServerSession(config);

  // Basic check: Does user have a session?
  if (!session && isProtectedRoute(pathname)) {
    return NextResponse.redirect("/auth/login");
  }

  // Note: We DON'T check permissions here
  // Zero-Trust: Verify at the resource level
  return NextResponse.next();
}
```

**Why not check permissions here?**

- Edge runs on CDN (limited capabilities)
- Permissions may change between edge and origin
- Resource-level checks are more secure

### Layer 2: API Route Auth

```typescript
// app/api/admin/identities/route.ts
export async function GET(request: NextRequest) {
  return withErrorHandler(async () => {
    // Zero-Trust: Authenticate AND authorize
    const userContext = await requireAdmin(request);

    // Now we KNOW user is both:
    // 1. Authenticated (valid session)
    // 2. Authorized (has admin permission)

    const identities = await listIdentities();
    return createSuccessResponse(identities);
  });
}
```

### Layer 3: Service Layer Validation

```typescript
// lib/services/kratos.service.ts
export async function getIdentity(id: string): Promise<Identity> {
  // Validate input (defense against injection)
  if (!id || typeof id !== "string") {
    throw new BadRequestError("Valid identity ID required");
  }

  // Call backend
  const response = await fetch(`${KRATOS_URL}/identities/${id}`);

  // Validate response
  if (response.status === 404) {
    throw new NotFoundError("Identity not found");
  }

  if (!response.ok) {
    throw new InternalServerError("Failed to fetch identity");
  }

  return await response.json();
}
```

### Layer 4: Backend Service

```
Ory Kratos & Keto perform their own validation
- Check session hasn't expired
- Verify permission tuples
- Validate data integrity
```

## 🚨 Common Zero-Trust Violations

### ❌ Violation 1: Trusting Headers

```typescript
// NEVER DO THIS
export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  // Headers can be forged by attacker!
}
```

**Fix:**

```typescript
export async function GET(request: NextRequest) {
  const userContext = await requireAuth(request);
  // Session verified via Ory Kratos
  const userId = userContext.userId;
}
```

### ❌ Violation 2: Trusting URL Parameters

```typescript
// NEVER DO THIS
export async function GET(request: NextRequest) {
  const isAdmin = searchParams.get("admin") === "true";
  // Anyone can add ?admin=true to URL!
}
```

**Fix:**

```typescript
export async function GET(request: NextRequest) {
  const userContext = await requireAuth(request);

  const isAdmin = await checkPermission({
    namespace: "GlobalRole",
    object: "admin",
    relation: "is_admin",
    subject: userContext.userId,
  });
}
```

### ❌ Violation 3: Client-Side Only Checks

```typescript
// NEVER DO THIS
// Frontend code
if (user.isAdmin) {
  // Show admin panel
  <AdminPanel /> // But don't check on backend!
}
```

**Fix:**

```typescript
// Frontend: Show based on permission (UX)
if (user.isAdmin) {
  <AdminPanel />
}

// Backend: ALWAYS verify (Security)
export async function GET(request: NextRequest) {
  await requireAdmin(request);
  // Now it's secure
  return data;
}
```

### ❌ Violation 4: Caching Permissions Too Long

```typescript
// DANGEROUS
const userPermissions = await getUserPermissions(userId);
// Store in session for 24 hours
session.permissions = userPermissions;

// Problem: If admin revokes permission, user still has it!
```

**Fix:**

```typescript
// Always check fresh from Keto
const hasPermission = await checkPermission(tuple);

// Or cache for SHORT duration (5 minutes max)
// with proper cache invalidation
```

### ❌ Violation 5: Implicit Trust

```typescript
// NEVER DO THIS
export async function DELETE(request: NextRequest) {
  const { userId } = await request.json();

  // Assuming if request reached here, it's authorized
  await deleteUser(userId); // DANGER!
}
```

**Fix:**

```typescript
export async function DELETE(request: NextRequest) {
  return withErrorHandler(async () => {
    const userContext = await requireAuth(request);
    const { userId } = await request.json();

    // Explicit permission check
    await requirePermission(userContext, {
      namespace: "User",
      object: userId,
      relation: "deleter",
    });

    await deleteUser(userId);
    return createSuccessResponse({ message: "Deleted" });
  });
}
```

## ✅ Zero-Trust Checklist

### Every Protected API Route Must:

- [ ] **Authenticate** user with `requireAuth()`
- [ ] **Authorize** with specific permission check
- [ ] **Validate** all inputs (query params, body, path params)
- [ ] **Use service layer** (don't call backend directly)
- [ ] **Handle errors** with `withErrorHandler()`
- [ ] **Fail closed** (deny if verification fails)
- [ ] **Log access** (for audit trail)

### Example Template:

```typescript
export async function METHOD(request: NextRequest) {
  return withErrorHandler(async () => {
    // ✅ 1. Authenticate
    const userContext = await requireAuth(request);

    // ✅ 2. Authorize
    await requirePermission(userContext, {
      namespace: "Resource",
      object: resourceId,
      relation: "action",
    });

    // ✅ 3. Validate
    const { id } = await params;
    if (!id) {
      throw new BadRequestError("ID required");
    }

    // ✅ 4. Service layer
    const data = await service.getData(id);

    // ✅ 5. Return
    return createSuccessResponse(data);
  });
}
```

## 🎭 Real-World Scenarios

### Scenario 1: Document Editing

**Requirement:** Users can edit documents they created or were granted access to.

#### ❌ Traditional Approach

```typescript
export async function PATCH(request: NextRequest) {
  const { documentId } = await params;
  const userId = request.headers.get("user-id"); // Trusting header

  const doc = await getDocument(documentId);

  // Simple ownership check
  if (doc.ownerId === userId) {
    await updateDocument(documentId, changes);
  }

  // Problem: Can't handle shared documents!
  // Problem: Headers can be forged!
}
```

#### ✅ Zero-Trust Approach

```typescript
export async function PATCH(request: NextRequest) {
  return withErrorHandler(async () => {
    // 1. Verify identity
    const userContext = await requireAuth(request);

    const { documentId } = await params;

    // 2. Check specific permission
    await requirePermission(userContext, {
      namespace: "Document",
      object: documentId,
      relation: "editor",
    });

    // 3. Now safe to proceed
    const changes = await request.json();
    const updated = await updateDocument(documentId, changes);

    return createSuccessResponse(updated);
  });
}
```

**Granting Access:**

```typescript
// Owner shares document with another user
await grantPermission({
  namespace: "Document",
  object: documentId,
  relation: "editor",
  subject: otherUserId,
});

// Now they can edit too!
```

### Scenario 2: Team-Based Access

**Requirement:** Team members can access team resources.

#### Permission Structure

```typescript
// User is member of team
{
  namespace: "Team",
  object: "team-123",
  relation: "member",
  subject: "user-456"
}

// Team has access to project
{
  namespace: "Project",
  object: "project-789",
  relation: "viewer",
  subject: "Team:team-123#member"
}
```

#### Checking Access

```typescript
export async function GET(request: NextRequest) {
  return withErrorHandler(async () => {
    const userContext = await requireAuth(request);
    const { projectId } = await params;

    // Keto resolves indirect permission automatically
    const canView = await checkPermission({
      namespace: "Project",
      object: projectId,
      relation: "viewer",
      subject: userContext.userId,
    });

    if (!canView) {
      throw new ForbiddenError("No access to project");
    }

    const project = await getProject(projectId);
    return createSuccessResponse(project);
  });
}
```

### Scenario 3: Hierarchical Roles

**Requirement:** Admins can do everything managers can, managers can do everything users can.

#### Permission Structure

```typescript
// Define hierarchy in Keto namespaces config
// admins inherit manager permissions
// managers inherit user permissions

// Grant admin role
{
  namespace: "Role",
  object: "admin",
  relation: "member",
  subject: userId
}
```

#### Checking Access

```typescript
// Check if user has admin OR manager OR user access
const canAccess = await requireAnyPermission(userContext, [
  { namespace: "Role", object: "admin", relation: "member" },
  { namespace: "Role", object: "manager", relation: "member" },
  { namespace: "Role", object: "user", relation: "member" },
]);

// Or with hierarchy configured, just check lowest level
const canAccess = await checkPermission({
  namespace: "Role",
  object: "user",
  relation: "member",
  subject: userContext.userId,
});
// If user is admin, this will still return true!
```

## 📊 Audit and Monitoring

### Log All Access Attempts

```typescript
export async function GET(request: NextRequest) {
  return withErrorHandler(async () => {
    const userContext = await requireAuth(request);
    const { documentId } = await params;

    try {
      await requirePermission(userContext, {
        namespace: "Document",
        object: documentId,
        relation: "viewer",
      });

      // ✅ Log successful access
      await auditLog.log({
        action: "document.view",
        userId: userContext.userId,
        resourceId: documentId,
        result: "success",
        timestamp: new Date(),
      });

      const doc = await getDocument(documentId);
      return createSuccessResponse(doc);
    } catch (error) {
      // 🚨 Log failed access attempt
      await auditLog.log({
        action: "document.view",
        userId: userContext.userId,
        resourceId: documentId,
        result: "denied",
        reason: error.message,
        timestamp: new Date(),
      });

      throw error;
    }
  });
}
```

### Monitor Anomalies

- Failed permission checks from same user
- Access from unusual locations
- Bulk permission changes
- Escalated privilege usage

## 🔄 Permission Lifecycle

### 1. Grant Permission

```typescript
await grantPermission({
  namespace: "Project",
  object: projectId,
  relation: "editor",
  subject: userId,
});
```

### 2. Verify Permission (on each request)

```typescript
const hasAccess = await checkPermission({
  namespace: "Project",
  object: projectId,
  relation: "editor",
  subject: userId,
});
```

### 3. Revoke Permission (when no longer needed)

```typescript
await revokePermission({
  namespace: "Project",
  object: projectId,
  relation: "editor",
  subject: userId,
});
```

### 4. Audit Permission Changes

```typescript
const history = await getPermissionHistory(userId);
// Returns all grants/revokes for user
```

## 🧪 Testing Zero-Trust

### Test Authentication

```typescript
test("should reject unauthenticated requests", async () => {
  const response = await fetch("/api/admin/identities");
  expect(response.status).toBe(401);
});

test("should accept authenticated requests", async () => {
  const response = await authenticatedFetch("/api/admin/identities", {
    session: validSession,
  });
  expect(response.status).not.toBe(401);
});
```

### Test Authorization

```typescript
test("should reject unauthorized users", async () => {
  const response = await authenticatedFetch("/api/admin/identities", {
    session: regularUserSession,
  });
  expect(response.status).toBe(403);
});

test("should accept authorized users", async () => {
  const response = await authenticatedFetch("/api/admin/identities", {
    session: adminUserSession,
  });
  expect(response.status).toBe(200);
});
```

### Test Permission Changes

```typescript
test("should deny access after permission revoked", async () => {
  // Grant permission
  await grantPermission(tuple);

  // Verify access
  let response = await authenticatedFetch("/api/resource", {
    session: userSession,
  });
  expect(response.status).toBe(200);

  // Revoke permission
  await revokePermission(tuple);

  // Verify denial
  response = await authenticatedFetch("/api/resource", {
    session: userSession,
  });
  expect(response.status).toBe(403);
});
```

## 📚 Further Reading

- [NIST Zero Trust Architecture](https://www.nist.gov/publications/zero-trust-architecture)
- [Google BeyondCorp](https://cloud.google.com/beyondcorp)
- [Ory Keto (Zanzibar)](https://www.ory.sh/docs/keto)
- [Google Zanzibar Paper](https://research.google/pubs/pub48190/)

## 💡 Key Takeaways

1. **Never trust, always verify** - Every request must be validated
2. **Verify at the resource level** - Don't just check at the edge
3. **Use explicit permissions** - Don't rely on implicit checks
4. **Fail closed** - Deny by default if verification fails
5. **Audit everything** - Log all access attempts
6. **Assume breach** - Design for defense in depth
7. **Least privilege** - Give minimum permissions needed

---

**Remember: In Zero-Trust, there is no "inside" or "outside" the network. Every request is treated as potentially hostile until proven otherwise.**
