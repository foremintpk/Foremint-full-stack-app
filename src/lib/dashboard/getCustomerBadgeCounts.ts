'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getSession, isB2BRole } from '@/lib/auth/get-session';

export interface CustomerBadgeCounts {
  notifications: number;
  actions: number;
  tickets: number;
}

/**
 * Fresh customer sidebar badge counts — no cache layer.
 * Called on every realtime event, every 30-second poll, and on initial page load.
 *
 * tickets: count of this user's open/in-progress tickets where admin has replied
 * more recently than the customer last viewed the thread. Uses
 * get_customer_unread_ticket_count() RPC to avoid column-to-column PostgREST
 * limitations (same pattern as admin's get_attention_ticket_count()).
 */
export async function getCustomerBadgeCounts(): Promise<CustomerBadgeCounts> {
  const empty: CustomerBadgeCounts = { notifications: 0, actions: 0, tickets: 0 };
  try {
    const session = await getSession();
    const userId = session.user.id;
    const isB2B = isB2BRole(session.profile.role);
    const adminSdk = createAdminClient();

    // Resolve order IDs for this user (B2B reads from assignments table)
    let orderIds: string[] = [];
    if (isB2B) {
      const { data: assignments } = await adminSdk
        .from('b2b_order_assignments')
        .select('order_id')
        .eq('b2b_user_id', userId);
      orderIds = (assignments || []).map((r) => r.order_id);
    } else {
      const { data: orders } = await adminSdk
        .from('orders')
        .select('id')
        .eq('user_id', userId);
      orderIds = (orders || []).map((o) => o.id);
    }

    // All three counts in parallel — no cache on any of them
    const [notifRes, resubmitRes, invoiceRes, { data: ticketCountData }] = await Promise.all([
      // Unread notifications
      adminSdk
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', userId)
        .eq('is_read', false),

      // Pending document resubmission requests
      orderIds.length > 0
        ? adminSdk
            .from('document_resubmission_requests')
            .select('*', { count: 'exact', head: true })
            .in('order_id', orderIds)
            .eq('status', 'pending')
        : Promise.resolve({ count: 0 }),

      // Unpaid/partial invoices (regular customers only)
      !isB2B && orderIds.length > 0
        ? adminSdk
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .in('id', orderIds)
            .in('payment_status', ['unpaid', 'partial'])
        : Promise.resolve({ count: 0 }),

      // Unread admin replies — column-to-column comparison requires RPC
      // (last_admin_reply_at > last_customer_viewed_at)
      adminSdk.rpc('get_customer_unread_ticket_count', { p_user_id: userId }),
    ]);

    return {
      notifications: notifRes.count ?? 0,
      actions: (resubmitRes.count ?? 0) + (invoiceRes.count ?? 0),
      tickets: (ticketCountData as number | null) ?? 0,
    };
  } catch {
    return empty;
  }
}
