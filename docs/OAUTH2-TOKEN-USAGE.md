# OAuth2 Token Usage Guide

## Overview

Your OAuth2 tokens are stored as **secure HTTP-only cookies** that are automatically sent with every request. This guide shows you how to access and use these tokens in your API routes.

## Available Tokens

After successful OAuth2 login, you have three tokens:

1. **access_token** - Used to authenticate API requests (expires in 1 hour)
2. **id_token** - Contains user identity information (email, name, etc.)
3. **refresh_token** - Used to get new access tokens (expires in 30 days)

## Usage Examples

### 1. Simple Protected API Route

```typescript
// app/api/my-api/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/oauth2";

export async function GET(request: NextRequest) {
  try {
    // This automatically reads the access_token cookie and validates it
    const user = await requireAuth();
    
    return NextResponse.json({
      message: "Success!",
      userId: user.sub,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
}
```

### 2. Optional Authentication

```typescript
import { getCurrentUser } from "@/lib/auth/oauth2";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  
  if (user) {
    // User is logged in
    return NextResponse.json({ userId: user.sub });
  } else {
    // Anonymous user
    return NextResponse.json({ message: "Not logged in" });
  }
}
```

### 3. Calling External APIs

```typescript
import { getAccessToken, requireAuth } from "@/lib/auth/oauth2";

export async function GET(request: NextRequest) {
  await requireAuth(); // Ensure user is authenticated
  
  const accessToken = await getAccessToken();
  
  // Call external API with Bearer token
  const response = await fetch("https://api.example.com/data", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  
  const data = await response.json();
  return NextResponse.json(data);
}
```

### 4. Check User Permissions (Scopes)

```typescript
import { requireAuth, hasScope } from "@/lib/auth/oauth2";

export async function POST(request: NextRequest) {
  await requireAuth();
  
  // Check if user has admin scope
  const isAdmin = await hasScope("admin");
  if (!isAdmin) {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 }
    );
  }
  
  // Admin-only logic here
  return NextResponse.json({ message: "Admin action completed" });
}
```

### 5. Get User Information

```typescript
import { getUserInfo, requireAuth } from "@/lib/auth/oauth2";

export async function GET(request: NextRequest) {
  await requireAuth();
  
  // Get user info from ID token (email, name, etc.)
  const userInfo = await getUserInfo();
  
  return NextResponse.json({
    email: userInfo?.email,
    name: userInfo?.name,
    picture: userInfo?.picture,
  });
}
```

## Available Helper Functions

Located in `/lib/auth/oauth2.ts`:

| Function | Description | Returns |
|----------|-------------|---------|
| `requireAuth()` | Require authentication, throw error if not logged in | `DecodedToken` |
| `getCurrentUser()` | Get current user from access token | `DecodedToken \| null` |
| `getUserInfo()` | Get user info from ID token (email, name) | `DecodedToken \| null` |
| `getAccessToken()` | Get raw access token | `string \| null` |
| `getIdToken()` | Get raw ID token | `string \| null` |
| `getRefreshToken()` | Get raw refresh token | `string \| null` |
| `hasScope(scope)` | Check if user has specific scope | `boolean` |
| `getAuthHeader()` | Get Bearer Authorization header | `string \| null` |
| `decodeToken(token)` | Decode JWT (without verification) | `DecodedToken \| null` |

## Testing Your API

### 1. Check Your Session

Visit: `https://gateway-production-6cac.up.railway.app/api/session`

Response:
```json
{
  "authenticated": true,
  "user": {
    "id": "56398ab4-7715-4c71-b509-317f36f15c3f",
    "clientId": "83eff052-9156-4edb-bba5-e7a810c78eed",
    "scopes": ["openid", "offline_access", "email", "profile"],
    "expiresAt": "2026-03-05T03:47:56.000Z"
  },
  "userInfo": {
    "email": "your@email.com",
    "emailVerified": true
  }
}
```

### 2. Test Protected Endpoint

Visit: `https://gateway-production-6cac.up.railway.app/api/protected-example`

## Token Flow

```
User Request
    ↓
Next.js API Route reads cookies automatically
    ↓
Call requireAuth() or getCurrentUser()
    ↓
Access token is decoded and validated
    ↓
User info is returned
    ↓
Use access token to call other APIs if needed
```

## Important Notes

1. **Tokens are HTTP-only** - JavaScript in the browser cannot access them (security feature)
2. **Tokens are sent automatically** - Browsers include cookies with every request to your domain
3. **Server-side only** - You can only read tokens in API Routes and Server Components, not Client Components
4. **Token validation** - Tokens are decoded but NOT cryptographically verified by default. For production, verify signatures against Hydra's JWKs
5. **Token refresh** - When access token expires, you need to implement refresh logic using the refresh_token

## Next Steps

1. ✅ Test the `/api/session` endpoint
2. ✅ Test the `/api/protected-example` endpoint
3. Create your own protected API routes using the helper functions
4. Implement token refresh logic when access token expires
5. Add signature verification for production security

## Production Security Recommendations

1. **Verify JWT signatures** - Fetch public keys from Hydra's `/.well-known/jwks.json` and verify token signatures
2. **Validate token claims** - Check audience, issuer, expiration
3. **Implement token refresh** - Auto-refresh access tokens before they expire
4. **Rate limiting** - Add rate limits to API endpoints
5. **CORS configuration** - Restrict which origins can call your APIs
