/*
 * ⚠️ DEPRECATED: This complete-profile endpoint is no longer used.
 *
 * This was part of the manual SimpleLogin OAuth flow. Now that SimpleLogin
 * is configured as a native OIDC provider in Kratos, profile completion
 * is handled automatically by Kratos during the OIDC flow.
 *
 * This file can be safely removed after verifying the OIDC flow works correctly.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { withErrorHandler } from "@/lib/errors";

export async function POST(request: NextRequest) {
  return withErrorHandler(async (): Promise<NextResponse> => {
    const body = await request.json();
    const { sub, email, name } = body;

    console.log("Complete profile request:", { sub, email, name });

    // Verify the pending user cookie matches
    const cookieStore = await cookies();
    const pendingUserCookie = cookieStore.get("pending_simplelogin_user");

    if (!pendingUserCookie) {
      console.error("No pending user cookie found");
      return NextResponse.json(
        { error: "No pending profile found" },
        { status: 400 },
      );
    }

    const pendingUser = JSON.parse(pendingUserCookie.value);

    if (pendingUser.sub !== sub) {
      console.error("User mismatch:", {
        pending: pendingUser.sub,
        provided: sub,
      });
      return NextResponse.json({ error: "Profile mismatch" }, { status: 400 });
    }

    console.log("Creating SimpleLogin session for user:", email);

    // Create a session cookie for SimpleLogin authentication
    // This bypasses Kratos for now - you can integrate later
    cookieStore.set(
      "simplelogin_session",
      JSON.stringify({
        userId: sub,
        email: email,
        name: name,
        avatar_url: pendingUser.avatar_url,
        provider: "simplelogin",
        authenticated: true,
        createdAt: new Date().toISOString(),
      }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      },
    );

    // Clear pending user cookie
    cookieStore.delete("pending_simplelogin_user");

    console.log("✅ SimpleLogin session created successfully for:", email);

    return NextResponse.json({
      success: true,
      user: {
        id: sub,
        email: email,
        name: name,
      },
    });
  });
}
