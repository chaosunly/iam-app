import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler, BadRequestError } from "@/lib/errors";
import { requireAdmin } from "@/lib/middleware/auth.middleware";
import {
  autoProvisionUser,
  bulkProvisionUsers,
} from "@/lib/services/auto-provision.service";

export async function POST(request: NextRequest) {
  return withErrorHandler(async (): Promise<NextResponse> => {
    await requireAdmin(request);
    const body = await request.json();

    if (body.userId) {
      await autoProvisionUser(body.userId);
      return NextResponse.json({
        success: true,
        message: "User provisioned successfully",
        userId: body.userId,
      });
    }

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

    throw new BadRequestError("Either userId or userIds array is required");
  });
}
