/**
 * SimpleLogin to Kratos Sync Service
 *
 * This service handles background synchronization of SimpleLogin users
 * to Ory Kratos identities. This allows SimpleLogin users to have
 * corresponding Kratos identities for advanced IAM features.
 */

export interface SimpleLoginUser {
  userId: string;
  email: string;
  name: string;
  avatar_url?: string;
}

/**
 * Sync SimpleLogin user to Kratos (creates or updates identity)
 * This runs in the background and doesn't block the user authentication flow
 *
 * NOTE: This is a simplified version. For full Kratos admin API integration,
 * you'll need to use the Kratos Admin API directly via fetch or use the
 * Identity and Self-Service Admin SDK (@ory/kratos-client)
 */
export async function syncSimpleLoginUserToKratos(
  user: SimpleLoginUser,
): Promise<{ success: boolean; identityId?: string; error?: string }> {
  try {
    const kratosAdminUrl = process.env.ORY_KRATOS_ADMIN_URL;

    if (!kratosAdminUrl) {
      console.warn("ORY_KRATOS_ADMIN_URL not configured, skipping Kratos sync");
      return { success: false, error: "Admin URL not configured" };
    }

    // Parse name into first and last
    const nameParts = user.name.split(" ");
    const firstName = nameParts[0] || user.name;
    const lastName = nameParts.slice(1).join(" ") || "";

    // Create identity via Kratos Admin API
    const response = await fetch(`${kratosAdminUrl}/admin/identities`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        schema_id: "default",
        traits: {
          email: user.email,
          name: {
            first: firstName,
            last: lastName,
          },
        },
        metadata_public: {
          provider: "simplelogin",
          simplelogin_id: user.userId,
          avatar_url: user.avatar_url,
          synced_at: new Date().toISOString(),
        },
      }),
    });

    if (response.ok) {
      const identity = await response.json();
      console.log(
        "✅ Kratos identity created for SimpleLogin user:",
        user.email,
      );
      return {
        success: true,
        identityId: identity.id,
      };
    } else if (response.status === 409 || response.status === 400) {
      // Identity might already exist
      console.log("Identity may already exist for:", user.email);
      return {
        success: true,
        error: "Identity already exists (not an error)",
      };
    } else {
      const errorText = await response.text();
      console.error(
        "Kratos identity creation failed:",
        response.status,
        errorText,
      );
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }
  } catch (error) {
    console.error("Failed to sync SimpleLogin user to Kratos:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Background sync function that can be called after user authentication
 * This doesn't block the user flow - just logs results
 */
export async function backgroundSyncToKratos(
  user: SimpleLoginUser,
): Promise<void> {
  // Run in the background, don't await
  syncSimpleLoginUserToKratos(user)
    .then((result) => {
      if (result.success) {
        console.log(`✅ Background sync successful for ${user.email}`);
      } else {
        console.log(
          `ℹ️ Background sync skipped for ${user.email}:`,
          result.error,
        );
      }
    })
    .catch((error) => {
      console.error("Background sync error:", error);
    });
}
