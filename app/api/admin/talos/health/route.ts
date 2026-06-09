import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/errors";
import { requireAdmin } from "@/lib/middleware/auth.middleware";
import { getTalosHealthReady } from "@/lib/services";

export async function GET(request: NextRequest) {
  return withErrorHandler(async (): Promise<NextResponse> => {
    await requireAdmin(request);

    const result = await getTalosHealthReady();
    return new NextResponse(result.body, {
      status: result.status,
      headers: {
        "content-type": result.contentType,
      },
    });
  });
}
