'use server';

import { revalidateTag } from 'next/cache';
import { getSession } from '@/lib/auth/get-session';

/**
 * Called from realtime subscription handlers (client components) to bust the
 * server-side unstable_cache layer before router.refresh() re-renders the page.
 *
 * Without this, router.refresh() re-runs the server component but
 * unstable_cache returns the still-valid cached payload → page shows stale data.
 */
export async function revalidateCustomerDashboard(): Promise<void> {
  try {
    const session = await getSession();
    const userId = session.user.id;
    revalidateTag(`customer-dashboard-${userId}`, 'max');
    revalidateTag(`notif-list-${userId}`, 'max');
    revalidateTag(`order-list-${userId}`, 'max');
    revalidateTag(`b2b-assignments-${userId}`, 'max');
  } catch {
    // Non-fatal: router.refresh() will still run; worst case the page re-renders
    // with cached data until the 30-second revalidate TTL expires naturally.
  }
}
