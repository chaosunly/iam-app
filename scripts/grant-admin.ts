/**
 * Grant admin access through the gateway
 * Usage: npx tsx scripts/grant-admin.ts <user-id>
 */

const USER_ID = process.argv[2];
const GATEWAY_URL =
  process.env.GATEWAY_URL || "https://gateway-production-c2b4.up.railway.app";

if (!USER_ID || USER_ID.length < 10) {
  console.error("❌ Please provide a valid user ID");
  console.error("Usage: npx tsx scripts/grant-admin.ts <user-id>");
  console.error("Example: npx tsx scripts/grant-admin.ts 47fe341a-181e-4c...");
  process.exit(1);
}

async function grantAdmin() {
  console.log("🔧 Granting admin access via gateway...");
  console.log("Gateway URL:", GATEWAY_URL);
  console.log("User ID:", USER_ID);
  console.log();

  try {
    const url = `${GATEWAY_URL}/admin/relation-tuples`;
    console.log("Calling:", url);

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        namespace: "GlobalRole",
        object: "admin",
        relation: "members",
        subject_id: USER_ID,
      }),
    });

    if (response.ok) {
      console.log("✅ Admin access granted successfully!");
      const text = await response.text();
      if (text) console.log("Response:", text);
    } else {
      const error = await response.text();
      console.error("❌ Failed to grant admin access");
      console.error("Status:", response.status, response.statusText);
      console.error("Error:", error);
      return false;
    }
  } catch (error) {
    console.error("❌ Network error:", error);
    return false;
  }

  console.log();
  return true;
}

async function verifyPermission() {
  console.log("🔍 Verifying admin permission...");

  try {
    // Method 1: GET with query params (matches lib/keto.ts)
    const params = new URLSearchParams({
      namespace: "GlobalRole",
      object: "admin",
      relation: "members",
      subject_id: USER_ID,
    });

    const url = `${GATEWAY_URL}/relation-tuples/check?${params}`;
    console.log("Calling:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log("Response:", data);
      if (data.allowed) {
        console.log("✅ Permission verified - User IS an admin!");
      } else {
        console.log(
          "❌ Permission check returned false - User is NOT an admin",
        );
      }
    } else {
      console.error("❌ Permission check failed:", response.status);
      const error = await response.text();
      console.error("Error:", error);
    }
  } catch (error) {
    console.error("❌ Error checking permission:", error);
  }

  console.log();

  // Method 2: POST with body (matches lib/services/keto.service.ts)
  try {
    console.log("🔍 Verifying with POST method...");
    const url = `${GATEWAY_URL}/relation-tuples/check`;
    console.log("Calling:", url);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        namespace: "GlobalRole",
        object: "admin",
        relation: "members",
        subject_id: USER_ID,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log("Response:", data);
      if (data.allowed) {
        console.log("✅ Permission verified via POST - User IS an admin!");
      } else {
        console.log("❌ Permission check via POST returned false");
      }
    } else {
      console.error("❌ POST permission check failed:", response.status);
    }
  } catch (error) {
    console.error("❌ Error with POST check:", error);
  }
}

async function listAdmins() {
  console.log();
  console.log("📋 Listing all admins...");

  try {
    const params = new URLSearchParams({
      namespace: "GlobalRole",
      object: "admin",
      relation: "members",
    });

    const url = `${GATEWAY_URL}/relation-tuples?${params}`;
    console.log("Calling:", url);

    const response = await fetch(url, {
      method: "GET",
    });

    if (response.ok) {
      const data = await response.json();
      const tuples = data.relation_tuples || [];
      console.log(`Found ${tuples.length} admin(s):`);
      tuples.forEach((tuple: any) => {
        const subjectId = tuple.subject_id?.id || tuple.subject_id;
        console.log(`  - ${subjectId}`);
      });
    } else {
      console.error("❌ Failed to list admins:", response.status);
    }
  } catch (error) {
    console.error("❌ Error listing admins:", error);
  }
}

// Run all operations
(async () => {
  const success = await grantAdmin();
  if (success) {
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1s
    await verifyPermission();
    await listAdmins();
  }

  console.log();
  console.log("🎯 Next steps:");
  console.log("1. If permission is verified, try logging in again");
  console.log("2. If still redirected to /dashboard, check Railway env vars:");
  console.log(
    "   ORY_KETO_READ_URL=https://gateway-production-c2b4.up.railway.app",
  );
  console.log(
    "   ORY_KETO_WRITE_URL=https://gateway-production-c2b4.up.railway.app",
  );
  console.log("3. Redeploy your Next.js service after updating env vars");
})();
