import { NextRequest, NextResponse } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/middleware";
import { time } from "@/lib/perf";
import type { Database } from "@/types/database";

type UserRole = Database["public"]["Enums"]["user_role"];

const PUBLIC_ROUTES = [
  "/",
  "/about",
  "/services",
  "/blog",
  "/contact",
  "/privacy",
  "/terms",
];

const AUTHENTICATED_ROUTES = [
  "/company",
  "/documents",
  "/orders",
  "/profile",
  "/progress",
  "/settings",
];

const SERVER_GUARDED_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/sign-in",
];

function matchesRoute(pathname: string, routes: string[]): boolean {
  return routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

function isAdminRole(role: UserRole | null): boolean {
  return role === "administrator" || role === "manager";
}

/**
 * Next.js 16+ Proxy function.
 * Handles request interception, session refresh, and RBAC.
 */
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isOnboardingRoute = pathname.startsWith("/onboarding");
  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isAdminRoute = pathname.startsWith("/admin");
  const isAuthenticatedRoute = matchesRoute(pathname, AUTHENTICATED_ROUTES);
  const isServerGuardedRoute = matchesRoute(pathname, SERVER_GUARDED_ROUTES);

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/auth/") ||
    /\.\w+$/.test(pathname)
  ) {
    return NextResponse.next({ request });
  }

  if (matchesRoute(pathname, PUBLIC_ROUTES)) {
    return NextResponse.next({ request });
  }

  if (isServerGuardedRoute) {
    return NextResponse.next({ request });
  }

  const { supabase, response } = createMiddlewareClient(request);

  const {
    data: { user },
    error,
  } = await time("proxy:auth.getUser()", () => supabase.auth.getUser());

  const authError = error as { code?: string; message?: string } | null;
  if (
    authError &&
    (authError.code === "refresh_token_not_found" ||
      authError.message?.includes("Refresh Token") ||
      authError.message?.includes("refresh_token"))
  ) {
    const allCookies = request.cookies.getAll();
    allCookies.forEach((cookie) => {
      if (cookie.name.startsWith("sb-")) {
        request.cookies.delete(cookie.name);
        response.cookies.set({
          name: cookie.name,
          value: "",
          maxAge: -1,
          path: "/",
        });
      }
    });
  }

  const shouldResolveRole = Boolean(user) && (isAdminRoute || isOnboardingRoute);
  const getUserRole = async (): Promise<UserRole | null> => {
    if (!user || !shouldResolveRole) {
      return null;
    }

    const { data: profile } = await time("proxy:role query", () => (supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle() as unknown as Promise<{ data: { role: UserRole } | null }>));
    return profile?.role || null;
  };

  if (isOnboardingRoute) {
    const userRole = await getUserRole();
    if (user && userRole) {
      if (isAdminRole(userRole)) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/admin";
        const redirectRes = NextResponse.redirect(redirectUrl);
        response.cookies.getAll().forEach((c) => redirectRes.cookies.set(c));
        return redirectRes;
      }
    }
    return response;
  }

  if (isDashboardRoute) {
    if (!user) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      const redirectRes = NextResponse.redirect(redirectUrl);
      response.cookies.getAll().forEach((c) => redirectRes.cookies.set(c));
      return redirectRes;
    }

    return response;
  }

  if (isAuthenticatedRoute) {
    if (!user) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      const redirectRes = NextResponse.redirect(redirectUrl);
      response.cookies.getAll().forEach((c) => redirectRes.cookies.set(c));
      return redirectRes;
    }

    return response;
  }

  if (isAdminRoute) {
    if (!user) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("next", pathname);
      const redirectRes = NextResponse.redirect(redirectUrl);
      response.cookies.getAll().forEach((c) => redirectRes.cookies.set(c));
      return redirectRes;
    }

    const userRole = await getUserRole();
    if (!isAdminRole(userRole)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/dashboard";
      const redirectRes = NextResponse.redirect(redirectUrl);
      response.cookies.getAll().forEach((c) => redirectRes.cookies.set(c));
      return redirectRes;
    }

    return response;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
