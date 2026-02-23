# SimpleLogin OIDC Migration Summary

## Overview

This document summarizes the migration from manual SimpleLogin OAuth to Kratos native OIDC provider integration. The migration simplifies the codebase and provides SimpleLogin users with full access to Kratos settings UI.

## What Changed

### ✅ Completed Changes

#### 1. Login Flow (`app/auth/login/login-client.tsx`)

**Before:** Custom "Sign in with SimpleLogin" button that manually constructed OAuth URLs
**After:** Removed custom button - Kratos login flow automatically shows OIDC provider buttons

**Changes:**

- Removed `handleSimpleLogin()` function (manual OAuth URL construction)
- Removed custom SimpleLogin button UI
- Removed SimpleLogin OAuth state management
- Kratos Elements `<Login>` component now handles everything

#### 2. Middleware (`middleware.ts`)

**Before:** Checked for both `simplelogin_session` cookie and Kratos session
**After:** Only checks Kratos session (OIDC creates proper Kratos sessions)

**Changes:**

- Removed SimpleLogin session cookie parsing logic
- Simplified to single `getServerSession()` call
- All users (including SimpleLogin) now have Kratos sessions

#### 3. Settings Page (`app/auth/settings/page.tsx`)

**Before:** Detected SimpleLogin users and showed "Settings Not Available" message
**After:** All users can access native Kratos settings UI

**Changes:**

- Removed SimpleLogin session detection
- Removed cookies import
- Removed custom "Settings Not Available" UI
- SimpleLogin users now get full Kratos settings UI

#### 4. Dashboard (`app/dashboard/page.tsx`)

**Before:** Checked SimpleLogin session first, fell back to Kratos session
**After:** Only uses Kratos session

**Changes:**

- Removed SimpleLogin session cookie parsing
- Removed dual session logic
- Simplified to single session source

#### 5. Deprecated Routes (Marked for Removal)

**app/auth/callback/simplelogin/route.ts**

- Added deprecation notice
- No longer used - Kratos handles OIDC callback at `/.ory/*`
- Can be safely removed after testing

**app/api/auth/complete-profile/route.ts**

- Added deprecation notice
- No longer used - Kratos handles profile completion automatically
- Can be safely removed after testing

#### 6. Logout Routes (Legacy Support)

**app/api/auth/logout/route.ts** and **app/auth/logout/route.ts**

- Added comments marking `simplelogin_session` cleanup as legacy
- Kept cookie cleanup logic for backward compatibility
- Can be cleaned up after all existing sessions expire

## Architecture Benefits

### Before (Manual OAuth)

```
User → Custom Button → Manual OAuth → SimpleLogin → Callback Route
→ Create simplelogin_session cookie → Sync to Kratos identity
→ Limited settings access (shown message to use SimpleLogin.io)
```

### After (Native OIDC)

```
User → Kratos Login Flow → OIDC Provider Button → SimpleLogin
→ Kratos handles OAuth → Creates proper Kratos session
→ Full settings UI access (password, 2FA, recovery, etc.)
```

### Key Improvements

1. **Simpler Codebase**
   - Removed ~200 lines of custom OAuth handling
   - Single session management approach
   - No dual session logic in middleware

2. **Better User Experience**
   - SimpleLogin users get full Kratos settings UI
   - Password management, 2FA setup, recovery methods
   - Consistent experience with other login methods

3. **Proper Security**
   - Kratos handles OIDC flow with built-in security
   - No custom session cookies to manage
   - Standard OIDC token validation

4. **Maintainability**
   - Less custom code to maintain
   - Follows Ory best practices
   - Easier to add more OIDC providers

## Testing Checklist

### Critical Tests

- [ ] **New User Login**
  1. Go to `/auth/login`
  2. Click "Sign in with SimpleLogin" (from Kratos OIDC)
  3. Authenticate with SimpleLogin
  4. Should redirect to dashboard
  5. Verify Kratos session cookie exists (ory_kratos_session)

- [ ] **Settings Access**
  1. Log in with SimpleLogin
  2. Navigate to `/auth/settings`
  3. Should see full Kratos settings UI (not error message)
  4. Verify can change password, setup 2FA, etc.

- [ ] **Session Persistence**
  1. Log in with SimpleLogin
  2. Close browser
  3. Reopen and visit dashboard
  4. Should still be logged in

- [ ] **Logout**
  1. Log in with SimpleLogin
  2. Click logout
  3. Should clear session and redirect to login
  4. Verify cannot access dashboard after logout

- [ ] **Middleware Protection**
  1. Without logging in, try to access `/dashboard`
  2. Should redirect to `/auth/login`
  3. After redirect, verify `return_to` parameter exists

### Secondary Tests

- [ ] **Admin Panel** (if user has admin permissions)
  1. Log in with SimpleLogin as admin user
  2. Should redirect to `/admin`
  3. Verify can manage identities and permissions

- [ ] **Registration** (if enabled for SimpleLogin OIDC)
  1. Test new user registration via SimpleLogin
  2. Verify identity created in Kratos
  3. Check traits are populated from OIDC claims

## Cleanup Tasks (Post-Migration)

After confirming OIDC flow works correctly for 1-2 weeks:

1. **Remove Deprecated Files**

   ```bash
   rm app/auth/callback/simplelogin/route.ts
   rm app/api/auth/complete-profile/route.ts
   rm app/auth/complete-profile/complete-profile-form.tsx
   rm app/auth/complete-profile/page.tsx
   ```

2. **Clean Up Logout Routes**
   - Remove `simplelogin_session` and `pending_simplelogin_user` cookie cleanup
   - Keep only Ory cookie cleanup

3. **Remove Environment Variables** (if no longer needed)

   ```bash
   # These might still be needed for Kratos OIDC config
   NEXT_PUBLIC_SIMPLELOGIN_CLIENT_ID
   SIMPLELOGIN_CLIENT_SECRET
   ```

   Note: Check if Kratos needs these vars or if they're only in Kratos config

4. **Update Documentation**
   - Update README with OIDC login instructions
   - Remove manual OAuth setup instructions
   - Document OIDC provider configuration

## Rollback Plan

If issues arise, you can temporarily rollback:

1. **Revert Frontend Changes**

   ```bash
   git revert <commit-hash>
   ```

2. **Update Kratos Config**
   - Remove SimpleLogin from `selfservice.methods.oidc.config.providers`
   - Restart Kratos service

3. **Restore Manual OAuth Flow**
   - Users will use custom SimpleLogin button again
   - Manual callback will handle authentication

## Related Documentation

- [KRATOS-OIDC-SIMPLELOGIN.md](./KRATOS-OIDC-SIMPLELOGIN.md) - Kratos OIDC configuration guide
- [SIMPLELOGIN-INTEGRATION.md](./SIMPLELOGIN-INTEGRATION.md) - Original SimpleLogin integration docs
- [BFF-PATTERN.md](./BFF-PATTERN.md) - Backend-for-Frontend architecture

## Migration Date

**Date:** 2024-01-XX (update with actual date)
**Kratos Version:** v25.4.0
**Next.js Version:** 14+

## Support

If you encounter issues:

1. Check Kratos logs for OIDC errors
2. Verify SimpleLogin OIDC config in Kratos
3. Check browser network tab for failed /.ory/\* requests
4. Review environment variables (ORY_KRATOS_ADMIN_URL, etc.)
