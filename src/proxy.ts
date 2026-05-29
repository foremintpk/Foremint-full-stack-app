import { NextRequest, NextResponse } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/middleware";
import type { Database } from "@/types/database";

// Correctly extract the role enum type from the Database
type UserRole = Database["public"]["Enums"]["user_role"];

// ── Route Definitions ────────────────────────────────────────────────────────

/** Routes that bypass all auth checks */
const PUBLIC_ROUTES = [
  "/",
  "/about",
  "/services",
  "/blog",
  "/contact",
  "/privacy",
  "/terms",
];

/** Routes that require the user to be logged OUT */
const AUTH_ROUTES = [
  "/register",
  "/forgot-password",
  "/reset-password",
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function matchesRoute(pathname: string, routes: string[]): boolean {
  return routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

// ── Proxy (formerly Middleware) ───────────────────────────────────────────────

/**
 * Next.js 16+ Proxy function.
 * Handles request interception, session refresh, and RBAC.
 */
export async function proxy(request: NextRequest) {
  const { supabase, response } = createMiddlewareClient(request);
  const pathname = request.nextUrl.pathname;

  // Refresh session — MUST happen before any auth checks
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1. Static assets, API routes, and Next internals — skip
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/auth/") ||
    /\.\w+$/.test(pathname)
  ) {
    return response;
  }

  // 2. Public routes — always accessible
  if (matchesRoute(pathname, PUBLIC_ROUTES)) {
    return response;
  }

  // Fetch user role from profiles using the typed Supabase client
  let userRole: UserRole | null = null;
  if (user) {
    const { data: profile } = await (supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle() as unknown as Promise<{ data: { role: UserRole } | null }>);
    userRole = profile?.role || null;
  }

  // 3. Auth routes — redirect authenticated users away (excluding login/sign-in pages)
  if (matchesRoute(pathname, AUTH_ROUTES)) {
    if (user && userRole) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = userRole === "administrator" || userRole === "manager" ? "/admin" : "/dashboard";
      return NextResponse.redirect(redirectUrl);
    }
    return response;
  }

  // 4. Onboarding Protection — block admins
  if (pathname.startsWith('/onboarding')) {
    if (user && userRole) {
      if (userRole === 'administrator' || userRole === 'manager') {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = '/admin';
        return NextResponse.redirect(redirectUrl);
      }
    }
    return response;
  }

  // 5. Dashboard Protection — redirect admins to admin, protect customer path, allow incomplete onboarding
  if (pathname.startsWith('/dashboard')) {
    if (!user) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      return NextResponse.redirect(redirectUrl);
    }

    if (userRole === 'administrator' || userRole === 'manager') {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/admin';
      return NextResponse.redirect(redirectUrl);
    }

    // Customer gets full access to dashboard regardless of onboarding completion status
    return response;
  }

  // 6. Admin Protection — isolate from customers, require authentication
  if (pathname.startsWith('/admin')) {
    if (!user) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(redirectUrl);
    }

    if (userRole !== 'administrator' && userRole !== 'manager') {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/dashboard';
      return NextResponse.redirect(redirectUrl);
    }

    return response;
  }

  return response;
}

// ── Matcher Configuration ───────────────────────────────────────────────────

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - sitemap.xml
     * - robots.txt
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
