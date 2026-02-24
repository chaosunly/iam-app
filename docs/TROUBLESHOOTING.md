# Troubleshooting Guide

## Authentication Flow Issues

### "Sign in" link redirects to internal Kratos URL

**Problem:** When clicking "Sign in" on the registration page (or other auth pages), you're redirected to `http://kratos.railway.internal:4433/...` instead of staying on your app domain.

**Cause:** The authentication flows are being created with the internal Kratos URL instead of your public app URL, so all generated links point to the internal domain.

**Solution:**

1. **Set the correct environment variables:**

   ```bash
   # Your public app URL
   NEXT_PUBLIC_APP_URL=https://gateway-production-xxxx.up.railway.app

   # SDK URL should be your app URL (NOT the internal Kratos URL)
   ORY_SDK_URL=https://gateway-production-xxxx.up.railway.app
   ```

2. **In Railway:**
   - Go to your service settings
   - Add/update these variables in the "Variables" tab
   - Redeploy your application

3. **How it works:**
   - When `ORY_SDK_URL` points to your app URL, the server makes requests to itself
   - The middleware intercepts these requests and proxies them to Kratos
   - Kratos generates flows with your public domain in all URLs
   - Links in the UI correctly point to your app domain

### Registration doesn't redirect to dashboard

**Problem:** After completing registration, you stay on the registration page instead of being redirected to the dashboard.

**Solution:** This should be fixed automatically by the middleware. Make sure:

1. The registration webhook is configured in Kratos (see Kratos configuration)
2. The webhook endpoint is accessible at `/api/auth/registration-hook`
3. Check the webhook logs for any errors

### Logout returns error "redirect count exceeded"

**Problem:** Clicking logout shows a `fetch failed` error with `redirect count exceeded`.

**Solution:** This has been fixed by adding `redirect: 'manual'` to the fetch calls in the logout route. Make sure you have the latest version of `/app/auth/logout/route.ts`.

## Webhook Issues

### Registration webhook receives empty identity

**Problem:** Logs show `[Registration Hook] No identity ID in payload` and the payload is `{"identity": {}}`.

**Cause:** The Kratos webhook configuration is sending a hardcoded empty object instead of the actual identity data.

**Solution:** Update your Kratos configuration webhook body to use JSONNet templating:

```yaml
selfservice:
  flows:
    registration:
      after:
        password:
          hooks:
            - hook: web_hook
              config:
                url: ${KRATOS_UI_URL}/api/auth/registration-hook
                method: POST
                # Use this instead of the hardcoded base64 value:
                body: base64://ZnVuY3Rpb24oY3R4KSB7ICJpZGVudGl0eSI6IGN0eC5pZGVudGl0eSB9
```

The base64 string decodes to: `function(ctx) { "identity": ctx.identity }`

## Environment Variables Reference

### Required Variables

| Variable               | Description                     | Example (Local)         | Example (Production)                  |
| ---------------------- | ------------------------------- | ----------------------- | ------------------------------------- |
| `NEXT_PUBLIC_APP_URL`  | Your public app URL             | `http://localhost:3000` | `https://your-app.railway.app`        |
| `ORY_SDK_URL`          | Ory SDK URL (should be app URL) | `http://localhost:3000` | `https://your-app.railway.app`        |
| `ORY_KRATOS_ADMIN_URL` | Kratos Admin API                | `http://localhost:4434` | `http://kratos.railway.internal:4434` |
| `ORY_KETO_READ_URL`    | Keto Read API                   | `http://localhost:4466` | `http://keto.railway.internal:4466`   |
| `ORY_KETO_WRITE_URL`   | Keto Write API                  | `http://localhost:4467` | `http://keto.railway.internal:4467`   |

### Why ORY_SDK_URL should point to your app

The `ORY_SDK_URL` is used to create authentication flows (login, registration, etc.). When this points to your app URL:

1. Server creates flow by calling your app
2. Middleware proxies the request to Kratos
3. Kratos returns flow with your domain in all URLs
4. Users see correct links (not internal URLs)

When this points to Kratos directly (e.g., `http://kratos.railway.internal:4433`):

1. Server creates flow by calling Kratos directly
2. Kratos doesn't know about your public domain
3. Flow contains internal URLs
4. Users see broken links to `kratos.railway.internal`

## Common Deployment Issues

### 1. Check middleware is working

Visit `/api/debug/config` to see your current configuration.

### 2. Verify Kratos is accessible

Check that Kratos is running and accessible within your Railway private network.

### 3. Check logs

```bash
# In Railway, check your service logs for errors
# Look for:
- [Middleware] Proxying Ory request
- [Registration Hook] Received payload
- [Logout] Found Ory session cookie
```

### 4. Test the flow manually

1. Try to register a new user
2. Check network tab in browser dev tools
3. Verify all requests go to your domain (not internal URLs)
4. Check that redirects work properly

## Getting Help

If you're still experiencing issues:

1. Check the logs in Railway
2. Use the browser dev tools network tab to see requests
3. Verify environment variables are set correctly
4. Check Kratos and Keto are running
5. Review the architecture docs in `/docs/ARCHITECTURE.md`
