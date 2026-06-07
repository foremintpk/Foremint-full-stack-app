import { time } from '@/lib/perf';
import type { CustomerNotification } from '@/types/dashboard';

/**
 * Shared notification fetch + shape used by both the full dashboard payload
 * (fetchDashboardDataQuery) and the lightweight notifications API route —
 * keeping them in one place guarantees both surfaces return identical items.
 *
 * B2B customers only see notifications addressed directly to them (not the
 * broadcast `customer` role); regular customers get direct + role-broadcast.
 */
export async function fetchCustomerNotifications(
  supabase: any,
  userId: string,
  isB2B: boolean,
  perfLabel = 'dashboard:notifications query'
): Promise<CustomerNotification[]> {
  let query = supabase
    .from('notifications')
    .select('id, title, body, type, link, is_read, created_at, payload');
  query = isB2B
    ? query.eq('recipient_id', userId)
    : query.or(`recipient_id.eq.${userId},and(recipient_id.is.null,target_role.eq.customer)`);

  const { data } = await time<any>(perfLabel, () => query
    .order('created_at', { ascending: false })
    .limit(30));

  return (data || []).map((n: any) => {
    let category: CustomerNotification['category'] = 'general';
    const typeLower = (n.type || '').toLowerCase();
    if (typeLower.includes('billing') || typeLower.includes('payment') || typeLower.includes('invoice')) {
      category = 'billing';
    } else if (typeLower.includes('compliance') || typeLower.includes('filing')) {
      category = 'compliance';
    } else if (typeLower.includes('renewal')) {
      category = 'renewal';
    } else if (typeLower.includes('document') || typeLower.includes('resubmit') || typeLower.includes('reject')) {
      category = 'document';
    }

    return {
      id: n.id,
      title: n.title || 'Notification',
      body: n.body,
      type: n.type,
      link: n.link,
      isRead: !!n.is_read,
      createdAt: n.created_at || new Date().toISOString(),
      category,
    };
  });
}
