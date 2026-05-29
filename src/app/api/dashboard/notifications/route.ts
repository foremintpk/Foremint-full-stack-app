import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDashboardData } from '@/lib/dashboard/getDashboardData';

export const dynamic = 'force-dynamic';

export async function GET() {
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

    // Query active profile to get the user's name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Fetch dashboard data (which includes notifications list)
    const dashboardData = await getDashboardData(user.id, profile.full_name || '', profile.email || '');

    const unreadNotifications = dashboardData.notifications.filter((n) => !n.isRead);

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
