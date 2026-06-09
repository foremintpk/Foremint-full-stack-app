import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isB2BRole } from '@/lib/auth/get-session';
import { fetchCustomerNotifications } from '@/lib/dashboard/customerNotifications';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();

    // Verify session
    const {
      data: claimsData,
      error: authError,
    } = await supabase.auth.getClaims();
    const user = claimsData?.claims;

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only the role is needed here (to pick the same B2B vs. regular notification
    // scope fetchDashboardDataQuery uses) — no need to load the full profile row
    // or run the rest of the dashboard pipeline just to read notifications.
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.sub)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const notifications = await fetchCustomerNotifications(
      supabase,
      user.sub,
      isB2BRole(profile.role)
    );

    const unreadNotifications = notifications.filter((n) => !n.isRead);

    const response = NextResponse.json({
      count: unreadNotifications.length,
      items: unreadNotifications,
    });

    // Apply strict private caching headers
    response.headers.set(
      'Cache-Control',
      'private, max-age=30, stale-while-revalidate=60'
    );

    return response;
  } catch (err: unknown) {
    console.error('Unhandled exception in customer notifications route:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
