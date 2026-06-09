'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getAdminUser } from '@/lib/admin/getAdminUser';
import type { BadgeCounts } from '@/types/admin';

/**
 * Always-fresh admin sidebar badge counts — never goes through unstable_cache.
 *
 * This function is called:
 *  (a) On initial layout render (via the layout server component, which has its
 *      own caching layer — route segment revalidate = 60).
 *  (b) From the realtime subscription in AdminShell every time a watched table
 *      changes (must be fresh, cache must be bypassed).
 *  (c) From the 30-second fallback poll in AdminShell.
 *
 * ROOT-CAUSE FIX: The previous version delegated llcRegistrations to
 * getUnreadOrderCount() which wraps the query in unstable_cache(revalidate:60).
 * When called from the realtime handler that cache was still valid → stale count
 * returned → setLiveBadges received the old value → sidebar did not update.
 * This version queries admin_order_views + orders directly so the result is
 * always live regardless of any cache layer above.
 *
 * ROOT-CAUSE FIX: The previous tickets query used
 *   .or('last_admin_reply_at.is.null,last_customer_reply_at.gt.last_admin_reply_at')
 * which compares a column to another column — PostgREST .or() only accepts
 * column-to-literal comparisons, so the filter was silently wrong.
 * This version calls get_attention_ticket_count() (a SECURITY DEFINER SQL
 * function) which performs the correct column-to-column comparison in SQL.
 */
export async function getAdminBadgeCounts(): Promise<BadgeCounts> {
  const empty: BadgeCounts = { llcRegistrations: 0, notifications: 0, tickets: 0 };
  try {
    const admin = await getAdminUser();
    if (!admin) return empty;

    const sdk = createAdminClient();

    // ── 1. Unread LLC registrations (always-fresh, no cache) ──────────────
    // Replicate the same logic as getUnreadOrderCount but without unstable_cache.
    const { data: viewedOrders } = await sdk
      .from('admin_order_views')
      .select('order_id')
      .eq('admin_id', admin.id);

    const viewedIds = (viewedOrders || []).map((v) => v.order_id as string);

    let ordersQuery = sdk
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .ilike('order_type', '%llc%');

    if (viewedIds.length > 0) {
      ordersQuery = ordersQuery.not('id', 'in', `(${viewedIds.join(',')})`);
    }

    const [
      { count: llcCount },
      { count: notifCount },
      { data: ticketCountData },
    ] = await Promise.all([
      // LLC unread count (fresh)
      ordersQuery,
      // Unread notifications (fresh)
      sdk
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .or(`recipient_id.eq.${admin.id},target_role.eq.${admin.role}`)
        .eq('is_read', false),
      // Tickets requiring admin attention via SQL function (column-to-column safe)
      sdk.rpc('get_attention_ticket_count'),
    ]);

    return {
      llcRegistrations: llcCount ?? 0,
      notifications: notifCount ?? 0,
      tickets: (ticketCountData as number | null) ?? 0,
    };
  } catch (err) {
    console.error('[getAdminBadgeCounts]', err);
    return empty;
  }
}
