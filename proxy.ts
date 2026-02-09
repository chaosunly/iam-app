import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@ory/nextjs/app";
import { createOryMiddleware } from "@ory/nextjs/middleware";
import oryConfig from "@/ory.config";

// Create Ory proxy middleware for authentication flows
const oryProxy = createOryMiddleware(oryConfig);

// Define protected routes and their required permissions
const PROTECTED_ROUTES = {
  admin: {
    pattern: /^\/admin/,
    requiredPermission: {
      namespace: "GlobalRole",
      object: "admin",
      relation: "is_admin",
    },
  },
  dashboard: {
    pattern: /^\/dashboard/,
    requiredAuth: true,
  },
  api: {
    pattern: /^\/api\/(admin|protected)/,
    requiredAuth: true,
  },
};

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  /^\/auth\//,
  /^\/$/,
  /^\/_next/,
  /^\/favicon/,
  /^\/api\/auth/,
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. First, let Ory handle its authentication flows and self-service routes
  // This is required for login, registration, recovery, etc.
  if (
    pathname.startsWith("/.ory") || 
    pathname.startsWith("/api/.ory") ||
    pathname.startsWith("/self-service")
  ) {
    return oryProxy(request);
  }

  // 2. Allow public routes
  if (PUBLIC_ROUTES.some((pattern) => pattern.test(pathname))) {
    return NextResponse.next();
  }

  try {
    // Check authentication
    const session = await getServerSession();

    // If no session, redirect to login
    if (!session) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("return_to", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // For admin routes, check additional permissions
    if (PROTECTED_ROUTES.admin.pattern.test(pathname)) {
      // Permission check will be done in the API layer for Zero-Trust
      // This just ensures they have a valid session
      return NextResponse.next();
    }

    // Allow authenticated users
    return NextResponse.next();
  } catch (error) {
    console.error("Proxy middleware error:", error);
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("return_to", pathname);
    return NextResponse.redirect(loginUrl);
  }
}

// Configure which paths the proxy should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
