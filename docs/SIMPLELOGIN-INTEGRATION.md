# SimpleLogin Integration Guide

This document provides step-by-step instructions for integrating "Sign in with SimpleLogin" (SIWSL) into the IAM application.

## Overview

SimpleLogin integration uses OAuth 2.0 to authenticate users. The flow:

1. User clicks "Sign in with SimpleLogin" button
2. User is redirected to SimpleLogin authorization page
3. User authorizes the application
4. SimpleLogin redirects back with authorization code
5. Application exchanges code for access token
6. Application fetches user info and creates/links account

## Setup Instructions

### 1. Register Your Application

1. Go to https://app.simplelogin.io/developer
2. Click "Create new app"
3. Fill in the application details:
   - **App Name**: IAM App (or your preferred name)
   - **Redirect URI Development**: `http://localhost:3000/auth/callback/simplelogin`
   - **Redirect URI Production**: `https://yourdomain.com/auth/callback/simplelogin`
4. Save and **copy your Client ID and Client Secret**

### 2. Configure Environment Variables

Add the following to your `.env.local` file:

```bash
NEXT_PUBLIC_SIMPLELOGIN_CLIENT_ID=your_client_id_here
SIMPLELOGIN_CLIENT_SECRET=your_client_secret_here
```

⚠️ **Security Notes:**

- Never commit `.env.local` to version control
- The `NEXT_PUBLIC_` prefix makes the client ID available in the browser
- The client secret should NEVER be exposed to the client

### 3. Restart Development Server

After adding environment variables:

```bash
npm run dev
```

## Architecture

### Components

1. **Login Button** (`/app/auth/login/login-client.tsx`)
   - Displays "Sign in with SimpleLogin" button
   - Generates CSRF state token
   - Redirects to SimpleLogin OAuth endpoint

2. **OAuth Callback** (`/app/auth/callback/simplelogin/route.ts`)
   - Handles OAuth redirect
   - Exchanges authorization code for access token
   - Fetches user information
   - Creates/links user account

3. **Auth Helper** (`/lib/simplelogin-auth.ts`)
   - Utility functions for Ory integration
   - Identity creation/linking logic
   - Session management helpers

### OAuth Flow Diagram

```
User                  App                 SimpleLogin
  |                    |                       |
  |-- Click Button --->|                       |
  |                    |---- Authorize ------->|
  |                    |                       |
  |<------- Redirect to SimpleLogin ----------|
  |                    |                       |
  |-- Authorize ------>|                       |
  |                    |                       |
  |<------- Redirect with code ---------------|
  |                    |                       |
  |                    |-- Exchange code ----->|
  |                    |<-- Access token ------|
  |                    |                       |
  |                    |-- Get user info ----->|
  |                    |<-- User data ---------|
  |                    |                       |
  |<-- Redirect to ---|                       |
  |    Dashboard       |                       |
```

## User Data Received

After successful authentication, you'll receive:

```typescript
{
  sub: "unique-user-id",        // Unique identifier
  email: "user@example.com",    // Verified email
  name: "John Doe",             // Full name
  avatar_url: "https://..."     // Profile picture (optional)
}
```

## Implementation Checklist

### Development Phase

- [x] Add SimpleLogin button to login page
- [x] Create OAuth callback route
- [x] Configure environment variables
- [ ] Test OAuth flow in development
- [ ] Implement Ory identity creation
- [ ] Implement session management
- [ ] Handle account linking (if user exists)
- [ ] Add error handling and user feedback

### Production Phase

- [ ] Update redirect URI in SimpleLogin settings
- [ ] Set production environment variables
- [ ] Test OAuth flow in production
- [ ] Monitor authentication errors
- [ ] Set up analytics tracking

## Testing

### Manual Testing Steps

1. Start development server:

   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000/auth/login`

3. Click "Sign in with SimpleLogin" button

4. You should be redirected to SimpleLogin

5. Authorize the application

6. Check browser console for user data logs

7. Verify redirect to dashboard

### Expected Console Output

```
SimpleLogin user authenticated: {
  sub: "...",
  email: "...",
  name: "..."
}
```

## Troubleshooting

### "SimpleLogin Client ID not configured"

**Cause**: Environment variable not set or incorrect name

**Solution**:

1. Check `.env.local` file exists
2. Verify variable name: `NEXT_PUBLIC_SIMPLELOGIN_CLIENT_ID`
3. Restart development server after adding variables

### "Token exchange failed"

**Cause**: Invalid client credentials or redirect URI mismatch

**Solution**:

1. Verify client ID and secret are correct
2. Check redirect URI matches exactly in SimpleLogin settings
3. Check server logs for detailed error message

### "Missing parameters" error

**Cause**: OAuth callback didn't receive code or state

**Solution**:

1. Check SimpleLogin app configuration
2. Verify redirect URI is correct
3. Check for JavaScript errors preventing redirect

### Button styling issues

**Cause**: Tailwind classes not applied correctly

**Solution**:

1. Verify Tailwind CSS is configured
2. Check dark mode classes work correctly
3. Inspect element in browser DevTools

## Security Considerations

### CSRF Protection

- State parameter used to prevent CSRF attacks
- State is generated with `crypto.randomUUID()`
- State is stored in sessionStorage and validated (TODO)

### Token Security

- Client secret kept server-side only
- Access tokens not exposed to client
- Tokens exchanged over HTTPS only in production

### Session Management

- Sessions should be created securely with Ory
- Session tokens should use httpOnly cookies
- Implement session expiration and refresh

## Next Steps

### Required Implementation

1. **Complete Ory Integration** (`/lib/simplelogin-auth.ts`)
   - Implement `createOrLinkOryIdentity()`
   - Implement `createOrySession()`
   - Handle existing user scenarios

2. **Add State Validation**
   - Store state securely server-side
   - Validate state in callback route
   - Handle CSRF attacks

3. **Improve Error Handling**
   - Display user-friendly error messages
   - Log errors for monitoring
   - Add retry mechanisms

4. **User Experience**
   - Add loading states during OAuth flow
   - Show success messages
   - Handle edge cases (closed popup, timeout)

### Optional Enhancements

- Add SimpleLogin profile sync
- Implement account unlinking
- Add SimpleLogin as 2FA option
- Support multiple OAuth providers
- Add analytics tracking

## Resources

- [SimpleLogin Documentation](https://simplelogin.io/docs/siwsl/intro/)
- [OAuth 2.0 Specification](https://oauth.net/2/)
- [Ory Kratos Documentation](https://www.ory.sh/docs/kratos)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review SimpleLogin documentation
3. Check application logs
4. Open an issue in the repository
