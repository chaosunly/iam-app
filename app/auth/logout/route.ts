import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();

  // Clear SimpleLogin session
  cookieStore.delete("simplelogin_session");
  cookieStore.delete("pending_simplelogin_user");

  console.log("User logged out - SimpleLogin session cleared");

  // Redirect to login
  return NextResponse.redirect(new URL("/auth/login", request.url));
}
