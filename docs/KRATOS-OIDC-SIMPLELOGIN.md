# Configuring Kratos to Use SimpleLogin as OIDC Provider

This guide explains how to configure Ory Kratos to handle SimpleLogin authentication natively, which gives users full access to Kratos self-service UIs (settings, etc.) with proper sessions.

## Why Use Kratos Native OIDC?

**Current Implementation (Manual OAuth):**

- ✅ Users can log in with SimpleLogin
- ✅ Custom settings page works
- ❌ Users can't access Kratos native settings UI
- ❌ No Kratos session (only SimpleLogin session)

**With Kratos Native OIDC:**

- ✅ Users can log in with SimpleLogin
- ✅ Full Kratos session created automatically
- ✅ Access to all Kratos self-service UIs
- ✅ Simpler architecture (Kratos handles OAuth)

## Configuration Steps

### 1. Update Kratos Configuration

Add SimpleLogin as an OIDC provider in your Kratos configuration:

```yaml
# kratos.yml
selfservice:
  methods:
    oidc:
      enabled: true
      config:
        providers:
          - id: simplelogin
            provider: generic
            label: SimpleLogin
            client_id: YOUR_SIMPLELOGIN_CLIENT_ID
            client_secret: YOUR_SIMPLELOGIN_CLIENT_SECRET
            issuer_url: https://app.simplelogin.io
            mapper_url: base64://ewogICJpZGVudGl0eSI6IHsKICAgICJ0cmFpdHMiOiB7CiAgICAgICJlbWFpbCI6ICJ7eyBjbGFpbXMuZW1haWwgfX0iLAogICAgICAibmFtZSI6IHsKICAgICAgICAiZmlyc3QiOiAie3sgY2xhaW1zLm5hbWUgfX0iCiAgICAgIH0KICAgIH0KICB9Cn0=
            scope:
              - openid
              - email
              - profile
```

The `mapper_url` is base64 encoded JSON that maps SimpleLogin claims to Kratos identity traits:

```json
{
  "identity": {
    "traits": {
      "email": "{{ claims.email }}",
      "name": {
        "first": "{{ claims.name }}"
      }
    }
  }
}
```

### 2. Update Your Login Page

Replace the manual SimpleLogin OAuth redirect with Kratos's OIDC flow:

```typescript
// app/auth/login/login-client.tsx
// Remove this:
const simpleLoginUrl = `https://app.simplelogin.io/oauth2/authorize?...`;

// The Kratos login flow will automatically show "Sign in with SimpleLogin"
// when you use the Ory Login UI or elements
```

### 3. Simplify Your Callback

You can remove the entire `/auth/callback/simplelogin/route.ts` - Kratos handles it automatically via its `/.ory/*` endpoints.

### 4. Update Middleware

Simplify your middleware to only check for Kratos sessions (no SimpleLogin session check needed):

```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const session = await getServerSession();

  if (!session || !session.identity) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  const userId = session.identity.id;
  // ... rest of your middleware
}
```

### 5. Remove Custom Settings Page

You can remove:

- `app/auth/settings/simplelogin-settings.tsx`
- `app/api/auth/settings/route.ts`
- The SimpleLogin-specific logic in `app/auth/settings/page.tsx`

All users (including SimpleLogin users) will use the standard Kratos settings UI.

## Benefits

1. **Proper Sessions**: SimpleLogin users get real Kratos sessions
2. **Native UIs**: Access to all Kratos self-service flows (settings, recovery, verification)
3. **Simpler Code**: Less custom code to maintain
4. **Better Security**: Kratos handles OAuth state validation, PKCE, etc.
5. **Consistent Experience**: All users have the same authentication flow

## Migration Path

If you want to migrate existing SimpleLogin users:

1. Deploy the new Kratos configuration
2. Keep the old callback for a transition period
3. Any SimpleLogin user who logs in again will automatically get a Kratos session
4. After transition period, remove old custom code

## SimpleLogin OAuth Endpoints

For your Kratos configuration, you'll need these SimpleLogin endpoints:

- **Authorization**: `https://app.simplelogin.io/oauth2/authorize`
- **Token**: `https://app.simplelogin.io/oauth2/token`
- **UserInfo**: `https://app.simplelogin.io/oauth2/userinfo`
- **Issuer**: `https://app.simplelogin.io`

## Testing

1. Deploy Kratos with the new configuration
2. Go to `/auth/login`
3. Click "Sign in with SimpleLogin"
4. Complete SimpleLogin OAuth
5. You'll be logged in with a full Kratos session
6. Access `/auth/settings` - you'll see the native Kratos settings UI

---

**Note**: This is the recommended approach for production. The current manual OAuth implementation works but is a workaround for the limitation that Kratos v25 doesn't support programmatic session creation.
