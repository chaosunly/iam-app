/**
 * Debug endpoint to check configuration
 * IMPORTANT: Remove this in production or add proper authentication
 */

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    env: {
      ORY_KETO_READ_URL: process.env.ORY_KETO_READ_URL || "NOT SET",
      ORY_KETO_WRITE_URL: process.env.ORY_KETO_WRITE_URL || "NOT SET",
      ORY_KRATOS_PUBLIC_URL: process.env.ORY_KRATOS_PUBLIC_URL || "NOT SET",
      ORY_SDK_URL: process.env.ORY_SDK_URL || "NOT SET",
      NODE_ENV: process.env.NODE_ENV,
    },
    note: "⚠️ Remove this endpoint in production!",
  });
}
