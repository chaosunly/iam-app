# Fix: SimpleLogin OIDC "Field does not exist: name" Error

## Problem

When users try to log in with SimpleLogin OIDC, they see an error:

```
jsonnetsecure: ERROR: RUNTIME ERROR: Field does not exist: name
```

This happens because the Kratos OIDC Jsonnet mapper tries to access `claims.name`, but SimpleLogin's UserInfo endpoint doesn't provide this field.

## Solution

Update your Kratos OIDC configuration with a defensive Jsonnet mapper that handles missing claims gracefully.

### Step 1: Create the Fixed Jsonnet Mapper

Use this Jsonnet code (it uses email username as fallback when `name` is missing):

```jsonnet
local claims = std.extVar('claims');
{
  identity: {
    traits: {
      email: claims.email,
      username: if std.objectHas(claims, 'name') then claims.name
                else std.split(claims.email, '@')[0],
    },
  },
}
```

### Step 2: Base64 Encode the Jsonnet

Run this command to encode it:

```bash
echo 'local claims = std.extVar("claims");
{
  identity: {
    traits: {
      email: claims.email,
      username: if std.objectHas(claims, "name") then claims.name
                else std.split(claims.email, "@")[0],
    },
  },
}' | base64 -w 0
```

This will output something like:

```
bG9jYWwgY2xhaW1zID0gc3RkLmV4dFZhcignY2xhaW1zJyk7CnsKICBpZGVudGl0eTogewogICAgdHJhaXRzOiB7CiAgICAgIGVtYWlsOiBjbGFpbXMuZW1haWwsCiAgICAgIHVzZXJuYW1lOiBpZiBzdGQub2JqZWN0SGFzKGNsYWltcywgJ25hbWUnKSB0aGVuIGNsYWltcy5uYW1lIAogICAgICAgICAgICAgICAgIGVsc2Ugc3RkLnNwbGl0KGNsYWltcy5lbWFpbCwgJ0AnKVswXSwKICAgIH0sCiAgfSwKfQo=
```

### Step 3: Update Kratos Configuration

Update your Kratos OIDC provider configuration (in Railway or wherever you manage Kratos config):

```yaml
selfservice:
  methods:
    oidc:
      enabled: true
      config:
        providers:
          - id: simplelogin
            provider: generic
            label: SimpleLogin
            client_id: ${SIMPLELOGIN_CLIENT_ID}
            client_secret: ${SIMPLELOGIN_CLIENT_SECRET}
            issuer_url: https://app.simplelogin.io
            mapper_url: base64://bG9jYWwgY2xhaW1zID0gc3RkLmV4dFZhcignY2xhaW1zJyk7CnsKICBpZGVudGl0eTogewogICAgdHJhaXRzOiB7CiAgICAgIGVtYWlsOiBjbGFpbXMuZW1haWwsCiAgICAgIHVzZXJuYW1lOiBpZiBzdGQub2JqZWN0SGFzKGNsYWltcywgJ25hbWUnKSB0aGVuIGNsYWltcy5uYW1lIAogICAgICAgICAgICAgICAgIGVsc2Ugc3RkLnNwbGl0KGNsYWltcy5lbWFpbCwgJ0AnKVswXSwKICAgIH0sCiAgfSwKfQo=
            scope:
              - openid
              - email
              - profile
            requested_claims:
              id_token:
                email:
                  essential: true
                email_verified:
                  essential: false
```

### Step 4: Update Identity Schema (if needed)

If your current identity schema requires a `name.first` field, you'll need to update it to use `username` instead:

**Old schema:**

```json
{
  "traits": {
    "properties": {
      "email": { "type": "string", "format": "email" },
      "name": {
        "type": "object",
        "properties": {
          "first": { "type": "string" }
        }
      }
    }
  }
}
```

**New schema:**

```json
{
  "traits": {
    "properties": {
      "email": {
        "type": "string",
        "format": "email",
        "title": "Email",
        "ory.sh/kratos": {
          "credentials": {
            "password": {
              "identifier": true
            }
          }
        }
      },
      "username": {
        "type": "string",
        "title": "Username"
      }
    },
    "required": ["email"]
  }
}
```

### Step 5: Restart Kratos

After updating the configuration:

```bash
# If using Railway, redeploy the Kratos service
# If using Docker, restart the container
docker restart kratos
# If using Ory Cloud, changes apply automatically
```

### Step 6: Test

1. Clear your browser cookies
2. Go to `/auth/login`
3. Click "Sign in with SimpleLogin"
4. Complete the OIDC flow
5. You should successfully log in without the name field error

## Alternative: Use More Detailed Name Fields

If SimpleLogin provides `given_name` and `family_name` instead of `name`, use this Jsonnet:

```jsonnet
local claims = std.extVar('claims');
local firstName = if std.objectHas(claims, 'given_name') then claims.given_name
                  else if std.objectHas(claims, 'name') then claims.name
                  else std.split(claims.email, '@')[0];

{
  identity: {
    traits: {
      email: claims.email,
      name: {
        first: firstName,
      },
    },
  },
}
```

## Verify the Fix

Check your Kratos logs - you should no longer see:

```
ERROR: RUNTIME ERROR: Field does not exist: name
```

Users should be able to complete the SimpleLogin OIDC flow successfully.
