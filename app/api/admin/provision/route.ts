/**
 * User Provisioning API Route
 * Allows admins to provision users with organization membership
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@ory/nextjs/app";
import { canAccessAdmin } from "@/lib/services/permission.service";
import {
  autoProvisionUser,
  bulkProvisionUsers,
} from "@/lib/services/auto-provision.service";

/**
 * POST /api/admin/provision
 * Provision a single user or multiple users
 * Requires: Admin role
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const session = await getServerSession();
    if (!session?.identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Authorize - only global admins can provision users
    const userId = session.identity.id;
    const hasAdminAccess = await canAccessAdmin(userId);

    if (!hasAdminAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // Single user provisioning
    if (body.userId) {
      await autoProvisionUser(body.userId);
      return NextResponse.json({
        success: true,
        message: "User provisioned successfully",
        userId: body.userId,
      });
    }

    // Bulk user provisioning
    if (body.userIds && Array.isArray(body.userIds)) {
      const results = await bulkProvisionUsers(body.userIds);
      return NextResponse.json({
        success: true,
        message: "Bulk provisioning complete",
        successCount: results.success.length,
        failedCount: results.failed.length,
        details: results,
      });
    }

    return NextResponse.json(
      { error: "Either userId or userIds array is required" },
      { status: 400 },
    );
  } catch (error) {
    console.error("Error provisioning users:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to provision users",
      },
      { status: 500 },
    );
  }
}
