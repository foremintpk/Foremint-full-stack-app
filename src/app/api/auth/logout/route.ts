/**
 * @file src/app/api/auth/logout/route.ts
 * @description Universal logout route handler.
 *
 * Accessible by all authenticated roles: administrator, manager, customer.
 * Clears the Supabase SSR session cookies, then redirects to /login.
 *
 * Usage:
 *   <a href="/api/auth/logout">Log out</a>
 *   router.push('/api/auth/logout')
 *   window.location.href = '/api/auth/logout'
 *
 * Proxy rules:
 *   /api/* routes are whitelisted in proxy.ts — no RBAC check runs here.
 *   Session invalidation is handled server-side via supabase.auth.signOut().
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();

  // Terminate the Supabase session — clears all sb-* cookies
  await supabase.auth.signOut();

  // Redirect to login regardless of role
  return NextResponse.redirect(
    new URL('/login', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000')
  );
}
