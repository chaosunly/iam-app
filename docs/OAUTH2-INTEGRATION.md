# IAM App - OAuth2/OIDC Integration

This Next.js app now handles Hydra's OAuth2 login and consent flow.

## New OAuth2 Endpoints

- `GET /api/oauth2/login` - Handles login challenges from Hydra
- `GET /api/oauth2/consent` - Handles consent challenges from Hydra  
- `GET /api/oauth2/logout` - Handles logout challenges from Hydra

## How It Works

1. **Client initiates OAuth2 flow** → Hydra redirects to `/api/oauth2/login?login_challenge=...`
2. **Login handler checks Kratos session**:
   - If session exists → Auto-accepts login with Hydra
   - If no session → Redirects to Kratos login page
3. **After Kratos login** → User returns to login handler with session
4. **Login accepted** → Hydra redirects to `/api/oauth2/consent?consent_challenge=...`
5. **Consent handler** → Auto-accepts (by default) or shows consent UI
6. **Consent accepted** → Hydra issues tokens and redirects back to client

## Environment Variables

Add to your Railway service or `.env.local`:

```bash
# Hydra Admin API (internal)
HYDRA_ADMIN_URL=http://hydra.railway.internal:4445

# Kratos Public API (via gateway)
KRATOS_PUBLIC_URL=https://gateway-production-7363.up.railway.app

# App public URL
NEXT_PUBLIC_APP_URL=https://gateway-production-6cac.up.railway.app

# Auto-accept consent (set to "false" to show consent UI)
AUTO_ACCEPT_CONSENT=true
```

## Update Hydra Configuration

Point Hydra's login/consent URLs to this app:

```yaml
urls:
  login: https://gateway-production-6cac.up.railway.app/api/oauth2/login
  consent: https://gateway-production-6cac.up.railway.app/api/oauth2/consent
  logout: https://gateway-production-6cac.up.railway.app/api/oauth2/logout
```

## Testing the Flow

1. Start OAuth2 authorization:
   ```
   https://hydra-production-a56f.up.railway.app/oauth2/auth?client_id=YOUR_CLIENT&response_type=code&scope=openid&redirect_uri=YOUR_REDIRECT
   ```

2. Hydra will redirect to your login handler
3. If you're not logged in → redirected to Kratos login (with SimpleLogin option)
4. After login → auto-accepted and consent approved
5. Hydra issues tokens → redirects back to your app

## Customization

- **Custom consent UI**: Modify `/api/oauth2/consent/route.ts` to render a consent page instead of auto-accepting
- **Custom claims**: Add user data to ID/access tokens in the consent handler's `session` parameter
- **Conditional consent**: Check scopes/client and conditionally accept/reject
