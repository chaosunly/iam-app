# Hydra OAuth2 Flow Setup Guide

Complete guide to setting up OAuth2 authentication with Ory Hydra, Ory Kratos, and SimpleLogin.

## Architecture Overview

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ↓
┌─────────────────────────────────────────────────┐
│              Nginx Gateway                      │
│  - /oauth2/*  → Hydra (port 4444)              │
│  - /.ory/*    → Kratos (port 4433)             │
│  - /api/*     → iam-app (Next.js)              │
└─────────────────────────────────────────────────┘
       │                 │                │
       ↓                 ↓                ↓
┌──────────┐      ┌──────────┐    ┌──────────┐
│  Hydra   │      │  Kratos  │    │ iam-app  │
│ (OAuth2) │◄────►│ (Auth)   │    │(Next.js) │
└──────────┘      └──────────┘    └──────────┘
       │                 │
       ↓                 ↓
┌──────────┐      ┌──────────┐
│PostgreSQL│      │PostgreSQL│
└──────────┘      └──────────┘
                        │
                        ↓
                  ┌──────────┐
                  │SimpleLogin│
                  │  (OIDC)   │
                  └──────────┘
```

## OAuth2 Flow Sequence

1. **User visits** `/auth/login` (iam-app)
2. **Auto-redirect** to `/oauth2/auth` (Hydra)
3. **Hydra checks** if user is authenticated
4. **Redirects to** `/api/oauth2/login?login_challenge=...` (iam-app)
5. **iam-app redirects** to Kratos login
6. **Kratos redirects** to SimpleLogin (OIDC provider)
7. **User logs in** with SimpleLogin
8. **SimpleLogin redirects** back to Kratos
9. **Kratos creates** identity session
10. **iam-app accepts** login with Hydra admin API
11. **Hydra redirects** to `/api/oauth2/consent?consent_challenge=...`
12. **iam-app accepts** consent with Hydra admin API
13. **Hydra issues** authorization code
14. **Redirects to** `/auth/callback?code=...`
15. **iam-app exchanges** code for tokens
16. **Stores tokens** in HTTP-only cookies
17. **Redirects to** `/dashboard` (authenticated)

## Prerequisites

- Railway account (or any cloud platform)
- GitHub repositories for each service
- SimpleLogin account (or other OIDC provider)
- PostgreSQL databases (2x - one for Hydra, one for Kratos)

## Services Setup

### 1. PostgreSQL Databases

Create two PostgreSQL databases on Railway:

**Hydra Database:**
- Service name: `postgres-hydra`
- Note the `DATABASE_URL` connection string

**Kratos Database:**
- Service name: `postgres-kratos`
- Note the `DATABASE_URL` connection string

### 2. Hydra Setup

**File: `Hydra-test/Dockerfile`**
```dockerfile
FROM oryd/hydra:v2.2.0

USER root
RUN apk add --no-cache gettext curl

COPY hydra.yml /etc/config/hydra.yml
COPY entrypoint.sh /entrypoint.sh

ENTRYPOINT ["sh", "/entrypoint.sh"]
```

**File: `Hydra-test/hydra.yml`**
```yaml
dsn: ${DSN}

serve:
  public:
    port: 4444
    host: 0.0.0.0
    cors:
      enabled: true
      allowed_origins:
        - ${HYDRA_CORS_ORIGIN}
      allowed_methods:
        - POST
        - GET
        - PUT
        - PATCH
        - DELETE
        - OPTIONS
      allowed_headers:
        - Authorization
        - Content-Type
        - Cookie
      exposed_headers:
        - Content-Type
        - Set-Cookie
      allow_credentials: true
  admin:
    port: 4445
    host: 0.0.0.0

urls:
  self:
    issuer: ${URLS_SELF_ISSUER}
  login: ${URLS_LOGIN}
  consent: ${URLS_CONSENT}
  logout: ${URLS_LOGOUT}
  error: ${URLS_ERROR}

secrets:
  system:
    - ${SECRETS_SYSTEM}
  cookie:
    - ${SECRETS_COOKIE}

oauth2:
  expose_internal_errors: false
  allowed_top_level_claims:
    - email
    - email_verified
    - name
    - picture
  hashers:
    algorithm: bcrypt
    bcrypt:
      cost: 10

strategies:
  access_token: jwt
  scope: exact

ttl:
  login_consent_request: 1h
  access_token: 1h
  refresh_token: 720h
  id_token: 1h
  auth_code: 10m

oidc:
  subject_identifiers:
    supported_types:
      - public
      - pairwise
    pairwise:
      salt: ${OIDC_SUBJECT_SALT}

log:
  level: debug
  format: json
```

**File: `Hydra-test/entrypoint.sh`**
```bash
#!/bin/sh
set -e

echo "Starting Hydra..."

# Validate required environment variables
if [ -z "$DSN" ]; then
  echo "ERROR: DSN environment variable is not set!"
  exit 1
fi

if [ -z "$SECRETS_SYSTEM" ]; then
  echo "ERROR: SECRETS_SYSTEM is not set!"
  exit 1
fi

# Expand environment variables in config
echo "Expanding environment variables in config..."
envsubst < /etc/config/hydra.yml > /tmp/hydra.yml

# Run migrations
echo "Running database migrations..."
hydra migrate sql "$DSN" --yes

# Clear any corrupt signing keys from previous deployments
echo "Clearing any existing signing keys..."
PGPASSWORD="${DB_PASSWORD}" psql "${DSN}" -c "DELETE FROM hydra_jwk WHERE sid IN ('hydra.openid.id-token', 'hydra.jwt.access-token');" 2>/dev/null || echo "Key cleanup skipped"

echo "Starting Hydra server - keys will auto-generate..."
exec hydra serve all --config /tmp/hydra.yml
```

**Environment Variables (Railway):**
```bash
DSN=postgres://user:pass@host:port/hydra_db
SECRETS_SYSTEM=your-32-char-secret-keep-it-stable
SECRETS_COOKIE=your-32-char-cookie-secret
URLS_SELF_ISSUER=https://hydra-production-xxx.up.railway.app
URLS_LOGIN=https://gateway-production-xxx.up.railway.app/api/oauth2/login
URLS_CONSENT=https://gateway-production-xxx.up.railway.app/api/oauth2/consent
URLS_LOGOUT=https://gateway-production-xxx.up.railway.app/api/oauth2/logout
URLS_ERROR=https://gateway-production-xxx.up.railway.app/error
HYDRA_CORS_ORIGIN=https://gateway-production-xxx.up.railway.app
OIDC_SUBJECT_SALT=your-random-salt

# For clearing keys
DB_PASSWORD=your-db-password
```

### 3. Kratos Setup

**File: `kratos/kratos.yml`**
```yaml
dsn: ${DSN}

serve:
  public:
    base_url: ${KRATOS_PUBLIC_URL}
    cors:
      enabled: true
      allowed_origins:
        - ${KRATOS_BROWSER_URL}
      allowed_methods:
        - POST
        - GET
        - PUT
        - PATCH
        - DELETE
      allowed_headers:
        - Authorization
        - Cookie
        - Content-Type
      exposed_headers:
        - Content-Type
        - Set-Cookie
      allow_credentials: true
  admin:
    base_url: ${KRATOS_ADMIN_URL}

selfservice:
  default_browser_return_url: ${KRATOS_BROWSER_URL}/
  allowed_return_urls:
    - ${KRATOS_BROWSER_URL}

  methods:
    password:
      enabled: true
    oidc:
      enabled: true
      config:
        providers:
          - id: simplelogin
            provider: generic
            client_id: ${SIMPLELOGIN_CLIENT_ID}
            client_secret: ${SIMPLELOGIN_CLIENT_SECRET}
            issuer_url: https://app.simplelogin.io
            mapper_url: file:///etc/config/kratos/simplelogin.jsonnet
            scope:
              - openid
              - email
              - profile
            requested_claims:
              id_token:
                email:
                  essential: true
                email_verified:
                  essential: true

  flows:
    login:
      ui_url: ${KRATOS_BROWSER_URL}/auth/login
    registration:
      ui_url: ${KRATOS_BROWSER_URL}/auth/registration
    recovery:
      ui_url: ${KRATOS_BROWSER_URL}/auth/recovery
    verification:
      ui_url: ${KRATOS_BROWSER_URL}/auth/verification
    settings:
      ui_url: ${KRATOS_BROWSER_URL}/auth/settings

identity:
  default_schema_id: default
  schemas:
    - id: default
      url: file:///etc/config/kratos/identity.schema.json

secrets:
  cookie:
    - ${SESSION_SECRETS}
  cipher:
    - ${SECRETS_CIPHER}

cookies:
  domain: ${COOKIE_DOMAIN}
  path: /
  same_site: Lax

session:
  cookie:
    domain: ${COOKIE_DOMAIN}
    path: /
    same_site: Lax

log:
  level: info
  format: json
```

**Environment Variables:**
```bash
DSN=postgres://user:pass@host:port/kratos_db
KRATOS_PUBLIC_URL=https://kratos-production-xxx.up.railway.app
KRATOS_ADMIN_URL=http://kratos.railway.internal:4434
KRATOS_BROWSER_URL=https://gateway-production-xxx.up.railway.app
COOKIE_DOMAIN=.up.railway.app
SESSION_SECRETS=your-32-char-secret
SECRETS_CIPHER=your-32-char-cipher-secret
SIMPLELOGIN_CLIENT_ID=your-simplelogin-client-id
SIMPLELOGIN_CLIENT_SECRET=your-simplelogin-client-secret
```

### 4. iam-app (Next.js) Setup

**Key Files:**

**`app/auth/login/page.tsx`** - Shows OAuth2 login button

**`app/auth/components/oauth2-login.tsx`** - Auto-redirects to Hydra
```typescript
"use client";
import { useEffect } from "react";

export function AutoOAuth2Login() {
  useEffect(() => {
    const clientId = "83eff052-9156-4edb-bba5-e7a810c78eed"; // Your OAuth2 client ID
    const redirectUri = "https://gateway-production-xxx.up.railway.app/auth/callback";
    const state = "/dashboard";
    
    const authUrl = new URL("/oauth2/auth", window.location.origin);
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid offline_access email profile");
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("state", encodeURIComponent(state));
    
    window.location.href = authUrl.toString();
  }, []);

  return <div>Redirecting to login...</div>;
}
```

**`app/api/oauth2/login/route.ts`** - Handles Hydra login challenge
```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@ory/nextjs/app";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const loginChallenge = searchParams.get("login_challenge");

    if (!loginChallenge) {
      return NextResponse.json(
        { error: "login_challenge is required" },
        { status: 400 }
      );
    }

    // Check if user has Kratos session
    const session = await getServerSession();

    if (!session || !session.identity) {
      // Use gateway URL for redirect
      const forwardedHost = request.headers.get("x-forwarded-host");
      const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
      const gatewayUrl = forwardedHost
        ? `${forwardedProto}://${forwardedHost}`
        : `${request.nextUrl.protocol}//${request.nextUrl.host}`;

      const kratosLoginUrl = `${gatewayUrl}/.ory/self-service/login/browser?return_to=${encodeURIComponent(
        `${gatewayUrl}/api/oauth2/login?login_challenge=${loginChallenge}`
      )}`;

      const response = NextResponse.redirect(kratosLoginUrl, { status: 307 });
      
      // Store login challenge in cookie
      response.cookies.set("oauth2_login_challenge", loginChallenge, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 600,
      });

      return response;
    }

    // User is authenticated - accept login
    const hydraAdminUrl = process.env.HYDRA_ADMIN_URL || "http://hydra.railway.internal:4445";
    
    const acceptResponse = await fetch(
      `${hydraAdminUrl}/admin/oauth2/auth/requests/login/accept?login_challenge=${loginChallenge}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: session.identity.id,
          remember: true,
          remember_for: 3600,
        }),
      }
    );

    if (!acceptResponse.ok) {
      throw new Error("Failed to accept login");
    }

    const acceptData = await acceptResponse.json();
    return NextResponse.redirect(acceptData.redirect_to, { status: 303 });
  } catch (error) {
    console.error("OAuth2 login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

**`app/api/oauth2/consent/route.ts`** - Handles Hydra consent challenge
```typescript
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const consentChallenge = searchParams.get("consent_challenge");

    if (!consentChallenge) {
      return NextResponse.json(
        { error: "consent_challenge is required" },
        { status: 400 }
      );
    }

    const hydraAdminUrl = process.env.HYDRA_ADMIN_URL || "http://hydra.railway.internal:4445";

    // Get consent request info
    const consentResponse = await fetch(
      `${hydraAdminUrl}/admin/oauth2/auth/requests/consent?consent_challenge=${consentChallenge}`
    );

    if (!consentResponse.ok) {
      throw new Error("Failed to get consent request");
    }

    const consentData = await consentResponse.json();

    // Accept all requested scopes
    const acceptResponse = await fetch(
      `${hydraAdminUrl}/admin/oauth2/auth/requests/consent/accept?consent_challenge=${consentChallenge}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_scope: consentData.requested_scope,
          grant_access_token_audience: consentData.requested_access_token_audience,
          remember: true,
          remember_for: 3600,
        }),
      }
    );

    if (!acceptResponse.ok) {
      throw new Error("Failed to accept consent");
    }

    const acceptData = await acceptResponse.json();
    return NextResponse.redirect(acceptData.redirect_to, { status: 303 });
  } catch (error) {
    console.error("Consent error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

**`app/auth/callback/route.ts`** - Exchanges auth code for tokens
```typescript
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Get gateway URL
    const forwardedHost = request.headers.get("x-forwarded-host");
    const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
    const gatewayUrl = forwardedHost
      ? `${forwardedProto}://${forwardedHost}`
      : `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    
    const HYDRA_TOKEN_URL = `${gatewayUrl}/oauth2/token`;
    const OAUTH2_REDIRECT_URI = `${gatewayUrl}/auth/callback`;
    
    const OAUTH2_CLIENT_ID = process.env.OAUTH2_CLIENT_ID;
    const OAUTH2_CLIENT_SECRET = process.env.OAUTH2_CLIENT_SECRET;

    if (!OAUTH2_CLIENT_ID || !OAUTH2_CLIENT_SECRET) {
      console.error("OAuth2 credentials not configured");
      return NextResponse.redirect(`${gatewayUrl}/auth/login?error=oauth_not_configured`);
    }

    if (error) {
      console.error("OAuth error:", error);
      return NextResponse.redirect(`${gatewayUrl}/auth/login?error=${error}`);
    }

    if (!code) {
      return NextResponse.redirect(`${gatewayUrl}/auth/login?error=no_code`);
    }

    // Exchange code for tokens
    const tokenResponse = await fetch(HYDRA_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: OAUTH2_REDIRECT_URI,
        client_id: OAUTH2_CLIENT_ID,
        client_secret: OAUTH2_CLIENT_SECRET,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange failed:", errorText);
      return NextResponse.redirect(
        `${gatewayUrl}/auth/login?error=token_exchange_failed`
      );
    }

    const tokens = await tokenResponse.json();

    // Store tokens in HTTP-only cookies
    const cookieStore = await cookies();
    
    cookieStore.set("access_token", tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: tokens.expires_in || 3600,
    });

    if (tokens.refresh_token) {
      cookieStore.set("refresh_token", tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
      });
    }

    if (tokens.id_token) {
      cookieStore.set("id_token", tokens.id_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: tokens.expires_in || 3600,
      });
    }

    const redirectUrl = state ? decodeURIComponent(state) : "/dashboard";
    return NextResponse.redirect(`${gatewayUrl}${redirectUrl}`);
  } catch (error) {
    console.error("OAuth callback error:", error);
    const forwardedHost = request.headers.get("x-forwarded-host");
    const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
    const gatewayUrl = forwardedHost
      ? `${forwardedProto}://${forwardedHost}`
      : `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    return NextResponse.redirect(`${gatewayUrl}/auth/login?error=callback_failed`);
  }
}
```

**Environment Variables:**
```bash
OAUTH2_CLIENT_ID=83eff052-9156-4edb-bba5-e7a810c78eed
OAUTH2_CLIENT_SECRET=your-client-secret
HYDRA_ADMIN_URL=http://hydra.railway.internal:4445
```

**`middleware.ts`** - Allow OAuth2 routes
```typescript
const PUBLIC_ROUTES = [
  /^\/auth\/login/,
  /^\/auth\/callback/,
  /^\/api\/oauth2\//,
  /^\/api\/session/,
  // ... other routes
];
```

### 5. Gateway (Nginx) Setup

**File: `gateway/nginx.conf.template`**
```nginx
server {
    listen 8080;
    server_name ${NGINX_HOST};

    # Hydra OAuth2 endpoints
    location /oauth2/ {
        proxy_pass http://hydra.railway.internal:4444/oauth2/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
    }

    # Kratos endpoints
    location /.ory/ {
        proxy_pass http://kratos.railway.internal:4433/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_cookie_domain kratos.railway.internal $host;
    }

    # iam-app (Next.js)
    location / {
        proxy_pass http://iam-app.railway.internal:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
    }
}
```

## Creating OAuth2 Client in Hydra

**Method 1: Using Hydra CLI**
```bash
railway run --service Hydra -- hydra create client \
  --endpoint http://localhost:4445 \
  --id 83eff052-9156-4edb-bba5-e7a810c78eed \
  --secret your-client-secret \
  --grant-type authorization_code,refresh_token \
  --response-type code \
  --scope openid,offline_access,email,profile \
  --redirect-uri https://gateway-production-xxx.up.railway.app/auth/callback \
  --token-endpoint-auth-method client_secret_post
```

**Method 2: Using Hydra Admin API**
```bash
curl -X POST http://localhost:4445/admin/clients \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "83eff052-9156-4edb-bba5-e7a810c78eed",
    "client_secret": "your-client-secret",
    "grant_types": ["authorization_code", "refresh_token"],
    "response_types": ["code"],
    "scope": "openid offline_access email profile",
    "redirect_uris": ["https://gateway-production-xxx.up.railway.app/auth/callback"],
    "token_endpoint_auth_method": "client_secret_post"
  }'
```

## Testing the Flow

### 1. Initial Test
1. Visit `https://gateway-production-xxx.up.railway.app/auth/login`
2. Should auto-redirect through the OAuth2 flow
3. Login with SimpleLogin
4. Should redirect to `/dashboard` with tokens

### 2. Check Session
Visit: `https://gateway-production-xxx.up.railway.app/api/session`

Expected response:
```json
{
  "authenticated": true,
  "user": {
    "id": "56398ab4-7715-4c71-b509-317f36f15c3f",
    "scopes": ["openid", "offline_access", "email", "profile"]
  }
}
```

### 3. Check Cookies
Open browser DevTools → Application → Cookies:
- `access_token` - JWT token
- `id_token` - Identity token
- `refresh_token` - Refresh token

## Troubleshooting

### Issue: "login_challenge is required"
**Solution:** Check that middleware allows `/api/oauth2/` routes

### Issue: "Token exchange failed"
**Solution:** 
- Verify `client_secret` matches in OAuth2 client and iam-app env
- Check `token_endpoint_auth_method` is `client_secret_post`

### Issue: "Could not ensure signing keys exist"
**Solution:** Clear corrupt keys:
```sql
DELETE FROM hydra_jwk WHERE sid IN ('hydra.openid.id-token', 'hydra.jwt.access-token');
```

### Issue: Redirects to localhost
**Solution:** Use `X-Forwarded-Host` and `X-Forwarded-Proto` headers in all handlers

### Issue: CORS errors
**Solution:** 
- Add gateway URL to `HYDRA_CORS_ORIGIN`
- Add gateway URL to Kratos `allowed_return_urls`

## Security Best Practices

1. **Secrets Management**
   - Use strong random secrets (32+ characters)
   - Never commit secrets to git
   - Keep `SECRETS_SYSTEM` stable (changing it invalidates tokens)

2. **HTTPS Only**
   - Always use HTTPS in production
   - Set `secure: true` on all cookies

3. **Cookie Settings**
   - Use `HttpOnly` for token cookies
   - Set `SameSite: Lax` or `Strict`
   - Set appropriate cookie domains

4. **Token Validation**
   - Verify JWT signatures against Hydra's JWKs
   - Check token expiration
   - Validate audience and issuer claims

5. **Rate Limiting**
   - Add rate limits to OAuth2 endpoints
   - Implement brute force protection

## Next Steps

1. ✅ Test the complete OAuth2 flow
2. ✅ Check `/api/session` endpoint
3. [ ] Implement token refresh logic
4. [ ] Add JWT signature verification
5. [ ] Set up monitoring and logging
6. [ ] Add user profile management
7. [ ] Implement logout flow

## Resources

- [Ory Hydra Documentation](https://www.ory.sh/docs/hydra)
- [Ory Kratos Documentation](https://www.ory.sh/docs/kratos)
- [OAuth 2.0 RFC](https://datatracker.ietf.org/doc/html/rfc6749)
- [OpenID Connect Specification](https://openid.net/specs/openid-connect-core-1_0.html)

## Support

For issues or questions:
1. Check Railway logs: `railway logs --service <service-name>`
2. Review this documentation
3. Check Hydra/Kratos documentation
4. Review network traces in browser DevTools
