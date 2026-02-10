/**
 * Test Keto connectivity via gateway
 */

const GATEWAY_URL =
  process.env.GATEWAY_URL || "https://gateway-production-c2b4.up.railway.app";

async function testKetoEndpoints() {
  console.log("🧪 Testing Keto endpoints via gateway\n");
  console.log("Gateway URL:", GATEWAY_URL);
  console.log();

  const tests = [
    {
      name: "Health Check (Kratos via gateway)",
      url: `${GATEWAY_URL}/health/ready`,
      method: "GET",
    },
    {
      name: "List all admins (GET /relation-tuples)",
      url: `${GATEWAY_URL}/relation-tuples?namespace=GlobalRole&object=admin&relation=members`,
      method: "GET",
    },
    {
      name: "Check permission (GET /relation-tuples/check)",
      url: `${GATEWAY_URL}/relation-tuples/check?namespace=GlobalRole&object=admin&relation=members&subject_id=test-user`,
      method: "GET",
    },
    {
      name: "Check permission (POST /relation-tuples/check)",
      url: `${GATEWAY_URL}/relation-tuples/check`,
      method: "POST",
      body: {
        namespace: "GlobalRole",
        object: "admin",
        relation: "members",
        subject_id: "test-user",
      },
    },
  ];

  for (const test of tests) {
    console.log(`📍 ${test.name}`);
    console.log(`   URL: ${test.url}`);

    try {
      const options: RequestInit = {
        method: test.method,
        headers: {
          "Content-Type": "application/json",
        },
      };

      if (test.body) {
        options.body = JSON.stringify(test.body);
      }

      const response = await fetch(test.url, options);

      if (response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType?.includes("application/json")) {
          const data = await response.json();
          console.log(`   ✅ Success (${response.status})`);
          console.log(
            "   Response:",
            JSON.stringify(data, null, 2)
              .split("\n")
              .map((l) => "   " + l)
              .join("\n")
              .trim(),
          );
        } else {
          const text = await response.text();
          console.log(`   ✅ Success (${response.status})`);
          if (text) console.log("   Response:", text);
        }
      } else {
        const error = await response.text();
        console.log(`   ❌ Failed (${response.status})`);
        if (error) console.log("   Error:", error);
      }
    } catch (error) {
      console.log(`   ❌ Network Error:`, (error as Error).message);
    }

    console.log();
  }

  console.log("📝 Summary:");
  console.log("✓ If all tests pass, your gateway is routing Keto correctly");
  console.log("✓ Use the grant-admin.ts script to add your user as admin");
  console.log("✓ Make sure Railway env vars point to the gateway URL:");
  console.log(`  ORY_KETO_READ_URL=${GATEWAY_URL}`);
  console.log(`  ORY_KETO_WRITE_URL=${GATEWAY_URL}`);
}

testKetoEndpoints();
