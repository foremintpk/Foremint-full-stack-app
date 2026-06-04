/**
 * @file src/lib/admin/actions/refreshAdmin.ts
 * @description Server Action to revalidate all cached admin dashboard data tags and path on user refresh request.
 * 
 * 1. Server vs Client choice rationale: Server Action ('use server').
 * 2. Caching layer: N/A (Responsible for invalidating layers 1 & 2).
 * 3. RBAC: Invoked by authenticated administrators or managers from the header component.
 * 4. Revalidation / Cache Busting: Triggers immediate revalidation of all dynamic tags and path layouts.
 */

'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

export async function refreshAdminData(adminId: string): Promise<void> {
  if (!adminId) return;

  // Invalidate cached resources by tag
  revalidateTag(`notif-count-${adminId}`, 'max');
  revalidateTag(`notif-list-${adminId}`, 'max');
  revalidateTag(`unread-orders-${adminId}`, 'max');
  revalidateTag(`nav-badges-${adminId}`, 'max');
  revalidateTag('overview-stats', 'max');
  revalidateTag('overview-earnings', 'max');
  revalidateTag('order-list-llc', 'max');
  revalidateTag('order-list-llc-stats', 'max');

  // Invalidate Next.js layouts & pages under the /admin router segment
  revalidatePath('/admin', 'layout');
}
