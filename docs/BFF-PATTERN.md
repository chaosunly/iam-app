# BFF Layer Guide

## What is BFF (Backend-For-Frontend)?

The BFF pattern creates a **dedicated backend service layer** specifically designed to serve the needs of your frontend application. Instead of the frontend directly calling multiple backend services, it calls a single BFF layer that orchestrates those calls.

## Benefits

### 1. **Separation of Concerns**

- Frontend doesn't know about IAM service internals
- Easy to swap IAM providers (e.g., Ory → Auth0)
- Business logic centralized

### 2. **Security**

- Sensitive credentials never exposed to frontend
- Admin API keys kept server-side
- Request validation and sanitization
- Consistent auth/authz enforcement

### 3. **Type Safety**

- Shared TypeScript types between API and UI
- Compile-time checking
- Better IDE support

### 4. **Performance**

- Request aggregation (combine multiple backend calls)
- Caching at BFF layer
- Response transformation and optimization

### 5. **Maintainability**

- Change backend without changing frontend
- Easier testing (mock service layer)
- Clear separation of responsibilities

## Our BFF Implementation

### Service Layer Structure

```typescript
lib/services/
├── kratos.service.ts      # Identity management
└── keto.service.ts        # Authorization management
```

### Service Responsibilities

#### Kratos Service (Identity)

- Abstracts Ory Kratos Admin API
- Handles identity CRUD operations
- Manages user sessions
- Provides search capabilities

#### Keto Service (Authorization)

- Abstracts Ory Keto Permission API
- Performs permission checks
- Manages relation tuples
- Implements Zanzibar-style permissions

## Code Comparison

### ❌ WITHOUT BFF (Tight Coupling)

```typescript
// API Route - tightly coupled to Kratos
export async function GET(request: NextRequest) {
  const KRATOS_URL = process.env.ORY_KRATOS_ADMIN_URL;

  // Direct dependency on Kratos API
  const response = await fetch(`${KRATOS_URL}/identities`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.KRATOS_TOKEN}`,
    },
  });

  // Manual error handling
  if (!response.ok) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }

  return NextResponse.json(await response.json());
}
```

**Problems:**

- API route knows Kratos details
- Hard to test without Kratos running
- Can't swap IAM providers easily
- Duplicate code across routes
- No type safety

### ✅ WITH BFF (Loose Coupling)

```typescript
// Service Layer (BFF)
// lib/services/kratos.service.ts
export async function listIdentities(
  page = 0,
  perPage = 250,
): Promise<Identity[]> {
  try {
    const response = await fetch(
      `${KRATOS_ADMIN_URL}/identities?page=${page}&per_page=${perPage}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new InternalServerError("Failed to fetch identities");
    }

    return await response.json();
  } catch (error) {
    throw new InternalServerError("Failed to list identities");
  }
}

// API Route - clean and simple
export async function GET(request: NextRequest) {
  return withErrorHandler(async () => {
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "0");

    // Simple service call - no Kratos details
    const identities = await listIdentities(page);

    return createSuccessResponse(identities);
  });
}
```

**Benefits:**

- API route is clean and focused
- Easy to mock `listIdentities()` for tests
- Type-safe with `Identity[]` return type
- Can replace Kratos implementation without touching routes
- Consistent error handling

## Layer Responsibilities

### 🎨 Frontend (UI)

```typescript
// Simple fetch to BFF
const identities = await fetch("/api/admin/identities").then((res) =>
  res.json(),
);
```

**Responsibilities:**

- Display data
- Handle user interactions
- Client-side validation
- UI state management

### 🌐 API Routes (BFF Interface)

```typescript
export async function GET(request: NextRequest) {
  const userContext = await requireAdmin(request);
  const data = await someService.getData();
  return createSuccessResponse(data);
}
```

**Responsibilities:**

- Request authentication & authorization
- Request/response transformation
- Input validation
- Error handling
- Calling service layer

### 🔧 Service Layer (BFF Core)

```typescript
export async function getData(): Promise<Data> {
  // Call backend services
  // Transform data
  // Handle errors
  return data;
}
```

**Responsibilities:**

- Backend service communication
- Business logic
- Data transformation
- Caching
- Error handling

### 🗄️ Backend Services (IAM)

```
Ory Kratos (Identity)
Ory Keto (Authorization)
```

**Responsibilities:**

- Identity storage
- Authentication
- Permission storage
- Authorization decisions

## Real-World Example: Creating an Identity

### Flow Diagram

```
┌──────────┐
│ Frontend │
└────┬─────┘
     │ POST /api/admin/identities { email: "..." }
     ▼
┌────────────┐
│ API Route  │
│ (BFF)      │──── requireAdmin() ────► Verify auth/authz
│            │
│            │──── createIdentity() ──┐
└────────────┘                        │
                                      ▼
                             ┌─────────────────┐
                             │ Kratos Service  │
                             │ (BFF Core)      │
                             │                 │
                             │ - Validate data │
                             │ - Transform     │
                             │ - Call Kratos   │
                             └────────┬────────┘
                                      │
                                      ▼
                             ┌─────────────────┐
                             │  Ory Kratos     │
                             │  Admin API      │
                             └─────────────────┘
```

### Code Implementation

#### Frontend

```typescript
async function createUser(email: string) {
  const response = await fetch("/api/admin/identities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      schema_id: "default",
      traits: { email },
    }),
  });

  return response.json();
}
```

#### API Route

```typescript
export async function POST(request: NextRequest) {
  return withErrorHandler(async () => {
    // 1. Auth/Authz
    await requireAdmin(request);

    // 2. Parse input
    const body: CreateIdentityRequest = await request.json();

    // 3. Call service (BFF)
    const identity = await createIdentity(body);

    // 4. Return response
    return createSuccessResponse(identity, 201);
  });
}
```

#### Service Layer

```typescript
export async function createIdentity(
  data: CreateIdentityRequest,
): Promise<Identity> {
  // Validate
  if (!data.schema_id || !data.traits) {
    throw new BadRequestError("schema_id and traits required");
  }

  // Call backend
  const response = await fetch(`${KRATOS_ADMIN_URL}/identities`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new InternalServerError("Failed to create identity");
  }

  return await response.json();
}
```

## Testing with BFF

### Without BFF

```typescript
// Must mock fetch globally
global.fetch = jest.fn(() =>
  Promise.resolve({ ok: true, json: () => Promise.resolve([]) }),
);

// Test knows about Kratos URLs
expect(fetch).toHaveBeenCalledWith("http://localhost:4434/admin/identities");
```

### With BFF

```typescript
// Mock service layer only
jest.mock("@/lib/services/kratos.service", () => ({
  listIdentities: jest.fn(() => Promise.resolve([mockIdentity])),
}));

// Test doesn't know about Kratos
const identities = await listIdentities();
expect(identities).toEqual([mockIdentity]);
```

## Adding New Services

### 1. Create Service File

```typescript
// lib/services/newservice.service.ts
import { InternalServerError } from "@/lib/errors";

const SERVICE_URL = process.env.NEW_SERVICE_URL;

export async function getResource(id: string): Promise<Resource> {
  try {
    const response = await fetch(`${SERVICE_URL}/resource/${id}`);

    if (!response.ok) {
      throw new InternalServerError("Failed to fetch resource");
    }

    return await response.json();
  } catch (error) {
    throw new InternalServerError("Resource fetch failed");
  }
}
```

### 2. Add Types

```typescript
// lib/types/api.ts
export interface Resource {
  id: string;
  name: string;
  createdAt: string;
}
```

### 3. Create API Route

```typescript
// app/api/resources/[id]/route.ts
import { requireAuth } from "@/lib/middleware/auth.middleware";
import { getResource } from "@/lib/services/newservice.service";
import { createSuccessResponse, withErrorHandler } from "@/lib/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withErrorHandler(async () => {
    await requireAuth(request);
    const { id } = await params;
    const resource = await getResource(id);
    return createSuccessResponse(resource);
  });
}
```

## Best Practices

### ✅ DO

1. **Keep services focused**

   ```typescript
   // One service per backend system
   kratos.service.ts → Ory Kratos only
   keto.service.ts → Ory Keto only
   ```

2. **Use TypeScript types**

   ```typescript
   export async function getIdentity(id: string): Promise<Identity> {
     // Return typed data
   }
   ```

3. **Handle errors properly**

   ```typescript
   if (!response.ok) {
     throw new InternalServerError("Descriptive message");
   }
   ```

4. **Validate inputs**

   ```typescript
   if (!id || typeof id !== "string") {
     throw new BadRequestError("Valid id required");
   }
   ```

5. **Document service methods**
   ```typescript
   /**
    * Fetches user identity by ID
    * @param id - The identity ID
    * @returns Identity object
    * @throws NotFoundError if identity doesn't exist
    */
   export async function getIdentity(id: string): Promise<Identity>;
   ```

### ❌ DON'T

1. **Don't mix concerns**

   ```typescript
   // ❌ DON'T put UI logic in services
   export async function getIdentityAndRenderHTML(id: string) { ... }
   ```

2. **Don't expose credentials**

   ```typescript
   // ❌ DON'T return tokens or secrets
   return { identity, kratosAdminToken: TOKEN };
   ```

3. **Don't skip type safety**

   ```typescript
   // ❌ DON'T use 'any'
   export async function getData(): Promise<any> { ... }
   ```

4. **Don't couple services**

   ```typescript
   // ❌ DON'T call other services directly
   // kratos.service.ts
   import { checkPermission } from './keto.service'; // BAD

   // ✅ DO call from API route instead
   const identity = await getIdentity(id);
   await requirePermission(userContext, ...); // GOOD
   ```

5. **Don't swallow errors**
   ```typescript
   // ❌ DON'T hide errors
   try {
     await fetch(...);
   } catch {
     return null; // BAD
   }
   ```

## Summary

The BFF pattern in this project:

- ✅ **Abstracts backend complexity** from API routes
- ✅ **Enables easy testing** through service mocking
- ✅ **Provides type safety** with TypeScript
- ✅ **Centralizes business logic** in services
- ✅ **Improves security** by hiding implementation details
- ✅ **Makes swapping backends easy** (change service, not routes)
- ✅ **Follows Zero-Trust** with middleware at API layer

**Remember:** The BFF is your application's backbone. Keep it clean, tested, and well-documented!
