/**
 * Registration Webhook Handler
 * Handles post-registration setup for new users
 * Assigns default organizations and permissions
 */

import { NextRequest, NextResponse } from "next/server";
import { assignDefaultPermissions } from "@/lib/services/user-setup.service";
import { logAuthEvent } from "@/lib/services/audit.service";

export async function POST(request: NextRequest) {
  try {
    // Parse the webhook payload from Kratos
    const payload = await request.json();

    console.log(
      "[Registration Hook] Received payload:",
      JSON.stringify(payload, null, 2),
    );

    // Extract identity ID from the payload
    // Kratos can send different payload structures depending on webhook config:
    // - Direct: { identity: { id: "..." } }
    // - Flow-based: { flow: { ... }, identity: { id: "..." } }
    // - After hook: entire flow object
    let identityId =
      payload?.identity?.id || // Standard webhook
      payload?.flow?.identity?.id || // Flow-based webhook
      payload?.Identity?.id; // Alternative capitalization

    console.log("[Registration Hook] Extracted identity ID:", identityId);
    console.log("[Registration Hook] Payload keys:", Object.keys(payload));
    console.log(
      "[Registration Hook] Identity object:",
      JSON.stringify(payload?.identity || payload?.Identity, null, 2),
    );

    if (!identityId) {
      console.error("[Registration Hook] No identity ID found in payload");
      console.error(
        "[Registration Hook] Full payload structure:",
        JSON.stringify(payload, null, 2),
      );
      return NextResponse.json(
        { error: "Invalid webhook payload - no identity ID found" },
        { status: 400 },
      );
    }

    // Assign default permissions and organization
    const success = await assignDefaultPermissions(identityId);

    if (success) {
      console.log(`[Registration Hook] Successfully set up user ${identityId}`);

      // Log the registration event
      await logAuthEvent(
        identityId,
        "registration",
        true,
        request.headers.get("x-forwarded-for") || undefined,
        request.headers.get("user-agent") || undefined,
      );

      return NextResponse.json({
        success: true,
        message: "User setup completed",
      });
    } else {
      console.error(`[Registration Hook] Failed to set up user ${identityId}`);
      return NextResponse.json(
        { error: "Failed to set up user permissions" },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("[Registration Hook] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "registration-webhook",
  });
}
