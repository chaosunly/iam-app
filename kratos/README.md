# Kratos Configuration Guide

This directory contains the Kratos identity schema and configuration files.

## Files

### `identity.schema.json`

Defines the structure of user identities and what fields appear in registration/login forms.

**Current schema includes:**

- **Email** - Used for login and verification
- **First Name** - User's given name
- **Last Name** - User's family name

### `kratos.yml`

Main Kratos configuration file with:

- Self-service flow URLs
- OIDC providers (SimpleLogin)
- Registration webhook configuration
- Security settings

## Using These Configurations

### Option 1: In Railway (Recommended for Production)

1. **Upload the identity schema:**

   ```bash
   # In Railway, add these files to your Kratos service
   # Or use a volume mount pointing to these files
   ```

2. **Set environment variables in Kratos service:**

   ```bash
   KRATOS_PUBLIC_URL=http://kratos.railway.internal:4433
   KRATOS_ADMIN_URL=http://kratos.railway.internal:4434
   KRATOS_UI_URL=https://your-app.railway.app
   SECRETS_COOKIE=your-random-secret-here
   ```

3. **Update Kratos to use the schema:**
   - Point to the schema file in your Kratos configuration
   - Make sure the file path matches where you mounted the schema

### Option 2: Using Kratos Cloud

If you're using Ory Cloud (Ory Network):

1. Go to your Ory Cloud project
2. Navigate to **Identity Schema**
3. Upload or paste the contents of `identity.schema.json`
4. Save and deploy

### Option 3: Local Development

1. **Update your local Kratos configuration** to point to this schema:

   ```yaml
   identity:
     default_schema_id: default
     schemas:
       - id: default
         url: file:///path/to/your/project/kratos/identity.schema.json
   ```

2. **Restart Kratos** to load the new schema

## What the Schema Does

The identity schema controls:

1. **Field Labels** - What users see as placeholders/labels
   - "E-Mail" for the email field
   - "First Name" for the first name field
   - "Last Name" for the last name field

2. **Validation** - What formats are accepted
   - Email must be valid format
   - Names must be 1-100 characters
   - All fields are required

3. **Credentials** - How users can authenticate
   - Email is used as the login identifier
   - Email is used for password reset
   - Email is used for account verification

## Customizing the Schema

To add more fields (e.g., phone, company, etc.):

```json
{
  "traits": {
    "properties": {
      "email": { ... },
      "name": { ... },
      "phone": {
        "type": "string",
        "title": "Phone Number",
        "format": "tel"
      },
      "company": {
        "type": "string",
        "title": "Company Name"
      }
    }
  }
}
```

## Troubleshooting

### Fields don't show labels

**Problem:** Input fields have no labels or show generic placeholders

**Solution:**

1. Verify your Kratos is using the correct identity schema
2. Check Kratos logs to ensure the schema loaded correctly
3. Restart Kratos after schema changes
4. Clear browser cache and reload the registration page

### Fields are in wrong order

**Problem:** Fields appear in unexpected order

**Solution:** The order in the schema determines the display order. Rearrange properties in the schema JSON.

### Required fields aren't enforced

**Problem:** Users can submit without filling all fields

**Solution:** Check the `required` array in your schema includes all mandatory fields.

## Testing the Changes

After updating the schema:

1. **Restart Kratos**
2. **Clear the registration flow** - Visit `/auth/registration` fresh
3. **Check the form** - You should now see:
   - "E-Mail" label/placeholder
   - "First Name" label/placeholder
   - "Last Name" label/placeholder
   - "Password" field

## Environment Variables for kratos.yml

Make sure these are set in your Kratos deployment:

```bash
# URLs
KRATOS_PUBLIC_URL=http://kratos.railway.internal:4433
KRATOS_ADMIN_URL=http://kratos.railway.internal:4434
KRATOS_UI_URL=https://your-app.railway.app

# Security
SECRETS_COOKIE=your-random-32-character-secret

# SimpleLogin OAuth (optional)
SIMPLELOGIN_CLIENT_ID=your_client_id
SIMPLELOGIN_CLIENT_SECRET=your_client_secret

# Email (optional - for verification/recovery)
SMTP_CONNECTION_URI=smtps://user:pass@smtp.example.com:465
SMTP_FROM_ADDRESS=noreply@example.com
SMTP_FROM_NAME=Your App Name
```

## References

- [Ory Kratos Identity Schema Documentation](https://www.ory.sh/docs/kratos/manage-identities/identity-schema)
- [JSON Schema Specification](https://json-schema.org/)
- [Ory Configuration Reference](https://www.ory.sh/docs/kratos/reference/configuration)
