import { getServerSession } from "@ory/nextjs/app";
import { NextRequest, NextResponse } from "next/server";
import config from "@/ory.config";
import { checkPermission } from "./keto";

// Middleware to check if user is authenticated and has admin permissions
export async function checkAuth(request: NextRequest) {
  try {
    const session = await getServerSession(config);
    
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Please login" },
        { status: 401 }
      );
    }

    // Check permission using Ory Keto
    const userId = session.identity.id;
    const hasPermission = await checkPermission({
      namespace: "GlobalRole",
      object: "admin",
      relation: "is_admin",
      subject: userId,
    });

    if (!hasPermission) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    return null; // Auth passed
  } catch (error) {
    console.error("Auth check error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 401 }
    );
  }
}
