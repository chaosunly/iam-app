# Auto-Provisioning Documentation

## Overview

The auto-provisioning system automatically grants new users basic permissions when they first access the application. This ensures that all authenticated users have the necessary organization membership to use the application.

## How It Works

### 1. **Automatic Provisioning on Dashboard Access**

When a user visits the dashboard for the first time, they are automatically added to the default organization as a member:

```typescript
// In app/dashboard/page.tsx
await autoProvisionUser(userId);
```

**What happens:**

- ✅ Checks if user already has permissions
- ✅ If not, adds them to `default-org` as a `member`
- ✅ Logs the provisioning action for audit
- ✅ Silent failure - doesn't block user if provisioning fails

### 2. **Manual Provisioning via API**

Admins can manually provision users through the API:

**Provision a single user:**

```bash
curl -X POST http://localhost:3000/api/admin/provision \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{"userId": "user-uuid-here"}'
```

**Bulk provision multiple users:**

```bash
curl -X POST http://localhost:3000/api/admin/provision \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{"userIds": ["user-1-uuid", "user-2-uuid", "user-3-uuid"]}'
```

### 3. **Bulk Provisioning Script**

For existing users who registered before auto-provisioning was implemented:

```bash
# Make executable (first time only)
chmod +x scripts/provision-existing-users.sh

# Run the script
./scripts/provision-existing-users.sh
```

**Edit the script** to include your user IDs:

```bash
USERS=(
  "56398ab4-7715-4c71-b509-317f36f15c3f"
  "8637c7da-59b7-4f24-b68c-63dee3c2aaf3"
  "e269aa0f-e825-4ecf-b4b5-c3a8c22e6af3"
)
```

## Default Permissions

When a user is auto-provisioned, they receive:

- **Organization Membership**: Added to `default-org` as a `member`
- **Dashboard Access**: Can view their user dashboard
- **Group Membership**: Can see groups they're added to
- **Settings Access**: Can manage their profile settings

## Permission Levels

After provisioning, admins can promote users:

| Role             | Namespace    | Object      | Relation | Permissions                            |
| ---------------- | ------------ | ----------- | -------- | -------------------------------------- |
| **Member**       | Organization | default-org | members  | Basic access to organization resources |
| **Admin**        | Organization | default-org | admins   | Can manage users and groups            |
| **Owner**        | Organization | default-org | owners   | Full control over organization         |
| **Global Admin** | GlobalRole   | admin       | members  | Platform-wide administrative access    |

## Architecture

```
┌─────────────────────────────────────────────────┐
│  User Registration (Kratos)                     │
│  - Creates identity                             │
│  - Sets up authentication                       │
└─────────────────────┬───────────────────────────┘
                      │
                      │ First login
                      ▼
┌─────────────────────────────────────────────────┐
│  Dashboard Access                                │
│  - Session validated                             │
│  - autoProvisionUser() called                    │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  Permission Check (Keto)                         │
│  - hasAnyPermissions(userId)                     │
│  - Returns true/false                            │
└─────────────────────┬───────────────────────────┘
                      │
                      │ If no permissions
                      ▼
┌─────────────────────────────────────────────────┐
│  Grant Permissions (Keto)                        │
│  - Add to Organization:default-org:members       │
│  - Log audit event                               │
└─────────────────────────────────────────────────┘
```

## Files Created

| File                                     | Purpose                        |
| ---------------------------------------- | ------------------------------ |
| `lib/services/auto-provision.service.ts` | Core provisioning logic        |
| `app/dashboard/page.tsx`                 | Triggers auto-provisioning     |
| `app/api/admin/provision/route.ts`       | Manual provisioning API        |
| `scripts/provision-existing-users.sh`    | Bulk provisioning shell script |

## Troubleshooting

### Users don't have permissions after registration

1. **Check if auto-provisioning is enabled** - Visit the dashboard to trigger it
2. **Check Keto connectivity** - Verify `ORY_KETO_WRITE_URL` is set correctly
3. **Check logs** - Look for `[AutoProvision]` messages in console

### Manual provisioning fails

1. **Verify user is admin** - Only global admins can provision users
2. **Check user IDs** - Ensure UUIDs are correct from Kratos
3. **Verify Keto is accessible** - Test with curl to Keto directly

### Script fails to provision users

1. **Check Keto URL** - Ensure `KETO_URL` in script matches your deployment
2. **Check user IDs** - Verify UUIDs exist in Kratos
3. **Check network** - Ensure your machine can reach Keto (Railway, etc.)

## Security Considerations

- ✅ **Fail-safe**: If provisioning fails, users can still log in (manual provisioning available)
- ✅ **Audit logging**: All provisioning actions are logged
- ✅ **Admin-only API**: Only global admins can manually provision users
- ✅ **Idempotent**: Safe to call multiple times on same user
- ✅ **Zero-trust**: Always checks permissions before provisioning

## Next Steps

After implementing auto-provisioning:

1. **Run bulk script** for existing users
2. **Monitor logs** for provisioning events
3. **Set up database** for group metadata (names, descriptions)
4. **Add user management UI** for admins to manage roles
5. **Implement role hierarchy** for fine-grained permissions

## Related Documentation

- [Groups and Organizations](./GROUPS-AND-ORGANIZATIONS.md)
- [Quick Start Guide](./QUICK-START-GROUPS.md)
- [Zero Trust Architecture](./ZERO-TRUST.md)
- [BFF Pattern](./BFF-PATTERN.md)
