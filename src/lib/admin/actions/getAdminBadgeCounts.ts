'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getAdminUser } from '@/lib/admin/getAdminUser';
import { getUnreadOrderCount } from '@/lib/admin/getUnreadOrderCount';
import { time } from '@/lib/perf';
import type { BadgeCounts } from '@/types/admin';

/**
 * Fresh admin sidebar badge counts. Called on-demand (initial load uses the
 * cached layout values) and by the realtime subscription in AdminShell whenever
 * a relevant table changes — so the numbers update without a page refresh.
 */
export async function getAdminBadgeCounts(): Promise<BadgeCounts> {
  const empty: BadgeCounts = { llcRegistrations: 0, notifications: 0, tickets: 0 };
  try {
    const admin = await getAdminUser();
    if (!admin) return empty;

    const sdk = createAdminClient();

    // Unread LLC registrations — delegate to the canonical getUnreadOrderCount(),
    // which is React cache()-deduped per request. Any other caller in this same
    // request (e.g. the admin layout) resolves to the SAME memoized computation,
    // so the admin_order_views + orders queries run at most once per request
    // instead of being recalculated here too.
    const [llcRegistrations, [notifRes, ticketsRes]] = await time('getAdminBadgeCounts:counts', () => Promise.all([
      getUnreadOrderCount(admin.id),
      Promise.all([
        sdk
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .or(`recipient_id.eq.${admin.id},target_role.eq.${admin.role}`)
          .eq('is_read', false),
        sdk
          .from('queries')
          .select('*', { count: 'exact', head: true })
          .in('status', ['open', 'in_progress']),
      ]),
    ]));

    return {
      llcRegistrations,
      notifications: notifRes.count || 0,
      tickets: ticketsRes.count || 0,
    };
  } catch (err) {
    console.error('[getAdminBadgeCounts]', err);
    return empty;
  }
}
