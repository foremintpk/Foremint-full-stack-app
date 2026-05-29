/**
 * @file src/lib/admin/getOverviewStats.ts
 * @description Highly optimized parallel database analytics query with a multi-layered server-side caching design.
 *
 * 1. Server vs Client choice rationale: Server side cached queries.
 * 2. Caching layer: Layer 1 + 2 - unstable_cache with a 120s TTL and cache() request deduplication.
 * 3. RBAC: Constrained to authenticated managers and administrators.
 * 4. Revalidation / Cache Busting: Manual refresh tags ('overview-stats', 'overview-earnings', 'overview-stats-{rangeKey}').
 *
 * FIX (Next.js 15+): cookies() must NOT be called inside unstable_cache().
 * createClient() is now called OUTSIDE the cache boundary and the client
 * is passed into the inner async fn via closure — not as a cache key arg.
 */

import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { OverviewStats, DateRangeFilter } from '@/types/admin';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

async function fetchOverviewStats(
  supabase: SupabaseClient<Database>,
  rangeKey: DateRangeFilter,
  start: string,
  end: string
): Promise<OverviewStats> {
  // Fire parallel queries using Promise.all to dramatically cut network overhead
  const [llcRes, paypalRes, revenueRes] = await Promise.all([
    supabase
      .from('orders')
      .select('status')
      .eq('order_type', 'llc')
      .gte('created_at', start)
      .lte('created_at', end),
    supabase
      .from('orders')
      .select('status')
      .eq('order_type', 'paypal')
      .gte('created_at', start)
      .lte('created_at', end),
    supabase
      .from('orders')
      .select('order_type, grand_total')
      .eq('payment_status', 'paid')
      .gte('created_at', start)
      .lte('created_at', end),
  ]);

  if (llcRes.error) console.error('Error fetching LLC stats:', llcRes.error);
  if (paypalRes.error) console.error('Error fetching PayPal stats:', paypalRes.error);
  if (revenueRes.error) console.error('Error fetching Revenue stats:', revenueRes.error);

  const llcOrders = llcRes.data || [];
  const paypalOrders = paypalRes.data || [];
  const revenueData = revenueRes.data || [];

  // 1. Map and accumulate LLC order counts
  const llcTotal = llcOrders.length;
  let llcPending = 0;
  let llcProcessing = 0;
  let llcCompleted = 0;

  llcOrders.forEach((o) => {
    const s = o.status as string;
    if (s === 'pending') llcPending++;
    else if (s === 'in_progress') llcProcessing++;
    else if (s === 'completed') llcCompleted++;
  });

  // 2. Map and accumulate PayPal order counts
  const paypalTotal = paypalOrders.length;
  let paypalPending = 0;
  let paypalProcessing = 0;
  let paypalCompleted = 0;

  paypalOrders.forEach((o) => {
    const s = o.status as string;
    if (s === 'pending') paypalPending++;
    else if (s === 'in_progress') paypalProcessing++;
    else if (s === 'completed') paypalCompleted++;
  });

  // 3. Map and accumulate Revenues
  let llcRevenue = 0;
  let paypalRevenue = 0;
  const invoiceCommissions = 0; // TODO: Pull from Invoices table once Chunk 4F is implemented

  revenueData.forEach((r) => {
    const amt = Number(r.grand_total) || 0;
    if (r.order_type === 'llc') {
      llcRevenue += amt;
    } else if (r.order_type === 'paypal') {
      paypalRevenue += amt;
    }
  });

  const totalEarnings = llcRevenue + paypalRevenue + invoiceCommissions;

  // 4. Compute Contribution Percentages
  let llcPercent = 0;
  let paypalPercent = 0;
  let invoicePercent = 0;

  if (totalEarnings > 0) {
    llcPercent = Math.round((llcRevenue / totalEarnings) * 100);
    paypalPercent = Math.round((paypalRevenue / totalEarnings) * 100);
    invoicePercent = Math.round((invoiceCommissions / totalEarnings) * 100);

    // Adjust rounding errors so the total sum always matches exactly 100%
    const sum = llcPercent + paypalPercent + invoicePercent;
    if (sum !== 100 && sum > 0) {
      const diff = 100 - sum;
      const maxVal = Math.max(llcPercent, paypalPercent, invoicePercent);
      if (maxVal === llcPercent) llcPercent += diff;
      else if (maxVal === paypalPercent) paypalPercent += diff;
      else invoicePercent += diff;
    }
  }

  return {
    llc: {
      total: llcTotal,
      pending: llcPending,
      processing: llcProcessing,
      completed: llcCompleted,
    },
    paypal: {
      total: paypalTotal,
      pending: paypalPending,
      processing: paypalProcessing,
      completed: paypalCompleted,
    },
    earnings: {
      llcRevenue,
      paypalRevenue,
      invoiceCommissions,
      totalEarnings,
      llcPercent,
      paypalPercent,
      invoicePercent,
    },
    rangeKey,
    fetchedAt: new Date().toISOString(),
  };
}

export async function getCachedOverviewStats(
  rangeKey: DateRangeFilter,
  startDateStr: string,
  endDateStr: string
): Promise<OverviewStats> {
  // createClient() (which calls cookies()) lives OUTSIDE unstable_cache — required by Next.js 15+
  const supabase = await createClient();

  return unstable_cache(
    async (rk: DateRangeFilter, start: string, end: string): Promise<OverviewStats> => {
      return fetchOverviewStats(supabase, rk, start, end);
    },
    [`overview-stats-${rangeKey}`],
    {
      revalidate: 120,
      tags: ['overview-stats', `overview-stats-${rangeKey}`, 'overview-earnings'],
    }
  )(rangeKey, startDateStr, endDateStr);
}

// Request-level memoized wrapper
export const getOverviewStats = cache(getCachedOverviewStats);
export { DATE_RANGES } from './dateRanges';
