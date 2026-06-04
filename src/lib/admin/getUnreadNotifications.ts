/**
 * @file src/lib/admin/getUnreadNotifications.ts
 * @description Fetcher for unread admin notifications with dual-layer caching.
 *
 * 1. Server vs Client choice rationale: Server Component utility.
 * 2. Caching layer:
 *    - React cache() for request deduplication in a single render tree.
 *    - unstable_cache() with 30 seconds TTL and targeted invalidation tags.
 * 3. RBAC: Constrained to notifications targeting the active admin ID or role.
 * 4. Revalidation / Cache Busting: revalidateTag(`notif-list-${adminId}`, 'max') or revalidateTag(`notif-count-${adminId}`, 'max').
 *
 * FIX (Next.js 15+): cookies() must NOT be called inside unstable_cache().
 * createClient() is now called OUTSIDE the cache boundary and the client
 * is passed into the inner async fn via closure — not as a cache key arg.
 */

import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { AdminRole, SafeAdminNotification } from '@/types/admin';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

async function fetchUnreadNotifications(
  supabase: SupabaseClient<Database>,
  adminId: string,
  adminRole: AdminRole
): Promise<SafeAdminNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, title, body, type, link, is_read, created_at')
    .or(`recipient_id.eq.${adminId},target_role.eq.${adminRole}`)
    .eq('is_read', false)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error fetching unread notifications:', error);
    return [];
  }

  return (data || []).map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    type: n.type,
    link: n.link,
    isRead: !!n.is_read,
    createdAt: n.created_at || new Date().toISOString(),
  }));
}

export async function getCachedUnreadNotifications(
  adminId: string,
  adminRole: AdminRole
): Promise<SafeAdminNotification[]> {
  const supabase = await createClient();

  return unstable_cache(
    async (id: string, role: AdminRole): Promise<SafeAdminNotification[]> => {
      return fetchUnreadNotifications(supabase, id, role);
    },
    [`notif-list-${adminId}`],
    {
      revalidate: 30,
      tags: [
        `notif-list-${adminId}`,
        `notif-count-${adminId}`,
        'notif-list-admin',
        'notif-count-admin'
      ],
    }
  )(adminId, adminRole);
}

export const getUnreadNotifications = cache(getCachedUnreadNotifications);
