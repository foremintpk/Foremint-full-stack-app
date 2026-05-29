/**
 * @file src/lib/admin/getLlcOrderStats.ts
 * @description Fetches the top 4 status statistics for LLC orders.
 * Supports caching using Next.js unstable_cache and request-level React cache().
 *
 * FIX (Next.js 15+): cookies() must NOT be called inside unstable_cache().
 * createClient() is now called OUTSIDE the cache boundary and the client
 * is passed into the inner async fn via closure — not as a cache key arg.
 */

import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { LlcTopStats, DateRangeFilter } from '@/types/admin';
import { DATE_RANGES } from './dateRanges';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

async function fetchLlcOrderStats(
  supabase: SupabaseClient<Database>,
  df: DateRangeFilter | 'all'
): Promise<LlcTopStats> {
  let query = supabase
    .from('orders')
    .select('status')
    .ilike('order_type', '%llc%');

  if (df !== 'all') {
    const range = DATE_RANGES.find((r) => r.key === df);
    if (range) {
      query = query
        .gte('created_at', range.startDate().toISOString())
        .lte('created_at', range.endDate().toISOString());
    }
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching LLC order stats:', error);
  }

  const orders = data || [];
  const total = orders.length;
  let pending = 0;
  let processing = 0;
  let formed = 0;

  orders.forEach((o) => {
    const s = o.status;
    if (s === 'pending') {
      pending++;
    } else if (s === 'in_progress') {
      processing++;
    } else if (s === 'completed' || s === 'confirmed') {
      formed++;
    }
  });

  return { total, pending, processing, formed };
}

export async function getCachedLlcOrderStats(
  dateFilter: DateRangeFilter | 'all'
): Promise<LlcTopStats> {
  // createClient() (which calls cookies()) lives OUTSIDE unstable_cache — required by Next.js 15+
  const supabase = await createClient();

  return unstable_cache(
    async (df: DateRangeFilter | 'all'): Promise<LlcTopStats> => {
      return fetchLlcOrderStats(supabase, df);
    },
    [`order-list-llc-stats-${dateFilter}`],
    {
      revalidate: 60,
      tags: ['order-list-llc-stats', `order-list-llc-stats-${dateFilter}`],
    }
  )(dateFilter);
}

export const getLlcOrderStats = cache(getCachedLlcOrderStats);
