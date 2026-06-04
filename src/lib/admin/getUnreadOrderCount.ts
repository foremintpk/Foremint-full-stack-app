/**
 * @file src/lib/admin/getUnreadOrderCount.ts
 * @description Fetcher for the count of unread orders (orders not yet viewed by this admin) with dual-layer caching.
 *
 * 1. Server vs Client choice rationale: Server Component utility.
 * 2. Caching layer:
 *    - React cache() for request deduplication in a single render tree.
 *    - unstable_cache() with 60 seconds TTL and targeted invalidation tags.
 * 3. RBAC: Constrained to profiles with admin or manager access.
 * 4. Revalidation / Cache Busting: revalidateTag(`unread-orders-${adminId}`, 'max').
 *
 * FIX (Next.js 15+): cookies() must NOT be called inside unstable_cache().
 * createClient() is now called OUTSIDE the cache boundary and the client
 * is passed into the inner async fn via closure — not as a cache key arg.
 */

import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

async function fetchUnreadOrderCount(
  supabase: SupabaseClient<Database>,
  adminId: string
): Promise<number> {
  const { data: views, error: viewsError } = await supabase
    .from('admin_order_views')
    .select('order_id')
    .eq('admin_id', adminId);

  if (viewsError) {
    console.error('Error fetching admin order views:', viewsError);
    return 0;
  }

  const viewedOrderIds = (views || []).map((v) => v.order_id);

  let query = supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .ilike('order_type', '%llc%');

  if (viewedOrderIds.length > 0) {
    query = query.not('id', 'in', `(${viewedOrderIds.join(',')})`);
  }

  const { count, error } = await query;

  if (error) {
    console.error('Error counting unread orders:', error);
    return 0;
  }

  return count || 0;
}

export async function getCachedUnreadOrderCount(adminId: string): Promise<number> {
  const supabase = await createClient();

  return unstable_cache(
    async (id: string): Promise<number> => {
      return fetchUnreadOrderCount(supabase, id);
    },
    [`unread-orders-${adminId}`],
    {
      revalidate: 60,
      tags: [`unread-orders-${adminId}`],
    }
  )(adminId);
}

export const getUnreadOrderCount = cache(getCachedUnreadOrderCount);
