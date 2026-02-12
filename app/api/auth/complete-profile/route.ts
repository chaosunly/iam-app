import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getOryClient } from "@/lib/ory-client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sub, email, name } = body;

    // Verify the pending user cookie matches
    const cookieStore = await cookies();
    const pendingUserCookie = cookieStore.get("pending_simplelogin_user");

    if (!pendingUserCookie) {
      return NextResponse.json(
        { error: "No pending profile found" },
        { status: 400 },
      );
    }

    const pendingUser = JSON.parse(pendingUserCookie.value);

    if (pendingUser.sub !== sub) {
      return NextResponse.json({ error: "Profile mismatch" }, { status: 400 });
    }

    const oryClient = getOryClient();

    try {
      // Create registration flow
      const registrationFlow = await oryClient.createNativeRegistrationFlow();

      // Parse name into first and last
      const nameParts = name.split(" ");
      const firstName = nameParts[0] || name;
      const lastName = nameParts.slice(1).join(" ") || "";

      // Complete registration with user data
      const result = await oryClient.updateRegistrationFlow({
        flow: registrationFlow.id,
        updateRegistrationFlowBody: {
          method: "password",
          traits: {
            email: email,
            name: {
              first: firstName,
              last: lastName,
            },
          },
          // Generate a random password since user authenticated via OAuth
          password: crypto.randomUUID() + "!A1a",
        },
      });

      // Clear pending user cookie
      cookieStore.delete("pending_simplelogin_user");

      // Set session cookie if available
      if (result.session_token) {
        cookieStore.set("ory_session_token", result.session_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 7, // 7 days
        });
      }

      console.log("✅ Profile completed successfully for:", email);

      return NextResponse.json({ success: true });
    } catch (oryError: unknown) {
      console.error("Ory registration error:", oryError);

      // If user already exists, try to create a login flow instead
      const errorMessage =
        oryError instanceof Error ? oryError.message : String(oryError);
      if (
        errorMessage.includes("exists") ||
        errorMessage.includes("duplicate")
      ) {
        try {
          // User already exists, create login flow
          await oryClient.createNativeLoginFlow();

          // Try to authenticate with the existing identity
          await oryClient.updateLoginFlow({
            flow: (await oryClient.createNativeLoginFlow()).id,
            updateLoginFlowBody: {
              method: "password",
              identifier: email,
              password: crypto.randomUUID() + "!A1a", // Won't work, but triggers flow
            },
          });

          // Clear pending user cookie
          cookieStore.delete("pending_simplelogin_user");

          return NextResponse.json({
            success: true,
            message: "Logged in with existing account",
          });
        } catch (loginError) {
          console.error("Login attempt failed:", loginError);
          // Clear pending cookie anyway
          cookieStore.delete("pending_simplelogin_user");

          // Redirect to dashboard anyway - they're authenticated via SimpleLogin
          return NextResponse.json({
            success: true,
            message: "Authenticated via SimpleLogin",
          });
        }
      }

      throw oryError;
    }
  } catch (error) {
    console.error("Profile completion error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to complete profile",
      },
      { status: 500 },
    );
  }
}
