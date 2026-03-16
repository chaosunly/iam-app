import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@ory/nextjs/app";
import { createOryMiddleware } from "@ory/nextjs/middleware";
import oryConfig from "@/ory.config";
import {
  canAccessAdmin,
  getUserDashboardRoute,
} from "@/lib/services/permission.service";
import { logAccessDenied } from "@/lib/services/audit.service";
import { assertRequiredKetoNamespaces } from "@/lib/services/keto.service";

// Create Ory proxy middleware for authentication flows
const oryProxy = createOryMiddleware(oryConfig);

// Define protected routes and their required permissions
const PROTECTED_ROUTES = {
  admin: {
    pattern: /^\/admin/,
    checkPermission: canAccessAdmin,
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
  /^\/auth\/login/,
  /^\/auth\/logout/,
  /^\/auth\/registration/,
  /^\/auth\/recovery/,
  /^\/auth\/verification/,
  /^\/auth\/callback/,
  /^\/auth\/error/,
  /^\/auth\/settings/,
  /^\/api\/oauth2\//,
  /^\/error/,
  /^\/$/,
  /^\/_next/,
  /^\/favicon/,
  /^\/api\/auth/,
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. First, let Ory handle its authentication flows and self-service routes
  // This is required for login, registration, recovery, etc.
  if (
    pathname.startsWith("/.ory") ||
    pathname.startsWith("/api/.ory") ||
    pathname.startsWith("/self-service")
  ) {
    console.log(
      `[Middleware] Proxying Ory request: ${request.method} ${pathname}`,
    );
    return oryProxy(request);
  }

  // 2. Allow public routes without session check
  if (PUBLIC_ROUTES.some((pattern) => pattern.test(pathname))) {
    return NextResponse.next();
  }

  // 3. For protected routes, check authentication
  try {
    // Check for Kratos session (includes OIDC provider logins like SimpleLogin)
    const session = await getServerSession();

    // If no session, redirect to login
    if (!session || !session.identity) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("return_to", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const userId = session.identity.id;

    const isProtectedRoute =
      PROTECTED_ROUTES.admin.pattern.test(pathname) ||
      PROTECTED_ROUTES.dashboard.pattern.test(pathname) ||
      PROTECTED_ROUTES.api.pattern.test(pathname);

    if (isProtectedRoute) {
      try {
        await assertRequiredKetoNamespaces();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Keto namespaces unavailable";
        console.error("[Middleware] Keto namespace check failed:", message);

        if (pathname.startsWith("/api/")) {
          return NextResponse.json(
            {
              error: "Authorization service misconfigured",
              details: message,
              status: 503,
            },
            { status: 503 },
          );
        }

        const errorUrl = new URL("/error", request.url);
        errorUrl.searchParams.set("error", "authorization_service_unavailable");
        errorUrl.searchParams.set("error_description", message);
        return NextResponse.redirect(errorUrl);
      }
    }

    // Check if trying to access admin panel
    if (PROTECTED_ROUTES.admin.pattern.test(pathname)) {
      const hasAdminAccess = await canAccessAdmin(userId);

      if (!hasAdminAccess) {
        console.log(
          `[Middleware] Access denied to admin panel for user ${userId}`,
        );

        // Log access denial
        await logAccessDenied(
          userId,
          pathname,
          "Not a global admin",
          request.headers.get("x-forwarded-for") || undefined,
        );

        // Redirect to user dashboard
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }

      console.log(`[Middleware] Admin access granted for user ${userId}`);
    }

    // Check if accessing login/registration page or home while authenticated - redirect to appropriate dashboard
    if (
      pathname === "/auth/login" ||
      pathname === "/auth/registration" ||
      pathname === "/"
    ) {
      const dashboardRoute = await getUserDashboardRoute(userId);
      return NextResponse.redirect(new URL(dashboardRoute, request.url));
    }

    // Check if admin trying to access regular dashboard - redirect to admin panel
    if (pathname === "/dashboard") {
      const hasAdminAccess = await canAccessAdmin(userId);
      if (hasAdminAccess) {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
    }

    // Allow authenticated users to proceed
    return NextResponse.next();
  } catch (error) {
    console.error("Middleware auth error:", error);
    // On error, redirect to login
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
