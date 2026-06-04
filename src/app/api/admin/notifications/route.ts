/**
 * @file src/app/api/admin/notifications/route.ts
 * @description API endpoint returning sanitized unread notifications for the active admin browser session.
 * 
 * 1. Server vs Client choice rationale: API Route Handler.
 * 2. Caching layer: Uses getCachedUnreadNotifications (Layer 1 server cache) and applies HTTP cache headers.
 * 3. RBAC: Strictly restricted to authenticated users with roles of administrator or manager.
 * 4. Revalidation / Cache Busting: Dynamic per session.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCachedUnreadNotifications } from '@/lib/admin/getUnreadNotifications';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Query active profile role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const role = profile.role;
    if (role !== 'administrator' && role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch notifications using the server unstable_cache wrapper
    const items = await getCachedUnreadNotifications(user.id, role);

    const response = NextResponse.json({
      count: items.length,
      items,
    });

    // Never let the browser cache notification responses — always fetch fresh from server
    response.headers.set('Cache-Control', 'no-store');

    return response;
  } catch (err: any) {
    console.error('Unhandled exception in admin notifications route:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
