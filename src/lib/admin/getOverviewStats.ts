import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { OverviewStats, DateRangeFilter, DailyTrendPoint } from '@/types/admin';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

async function fetchOverviewStats(
  supabase: SupabaseClient<Database>,
  rangeKey: DateRangeFilter,
  start: string,
  end: string
): Promise<OverviewStats> {
  // PayPal accounts and the PKR invoice ledger were removed from the product;
  // earnings are LLC order revenue only. Both tables were empty, so the figures
  // reported here are unchanged by their removal.
  const [llcRes, llcRevenueRes] = await Promise.all([
    supabase
      .from('orders')
      .select('status, created_at')
      .eq('order_type', 'llc')
      .gte('created_at', start)
      .lte('created_at', end),

    supabase
      .from('orders')
      .select('grand_total, created_at')
      .eq('order_type', 'llc')
      .eq('payment_status', 'paid')
      .gte('created_at', start)
      .lte('created_at', end),
  ]);

  if (llcRes.error) console.error('Error fetching LLC stats:', llcRes.error);
  if (llcRevenueRes.error) console.error('Error fetching LLC revenue:', llcRevenueRes.error);

  const llcOrders = llcRes.data || [];
  const llcRevenueData = llcRevenueRes.data || [];

  // 1. LLC order counts
  const llcTotal = llcOrders.length;
  let llcPending = 0, llcInProgress = 0, llcFormed = 0;
  llcOrders.forEach((o) => {
    const s = o.status as string;
    if (s === 'pending') llcPending++;
    else if (s === 'initialized' || s === 'submitted_in_state' || s === 'ein_pending') llcInProgress++;
    else if (s === 'formed') llcFormed++;
  });

  // 2. Revenue totals — LLC orders are now the only earnings source.
  const llcRevenue = llcRevenueData.reduce((sum, r) => sum + (Number(r.grand_total) || 0), 0);
  const totalEarnings = llcRevenue;

  // 3. Percentages
  const llcPercent = totalEarnings > 0 ? 100 : 0;

  // 5. Daily trend — group all records by YYYY-MM-DD
  const trendMap = new Map<string, DailyTrendPoint>();

  const getOrCreate = (date: string): DailyTrendPoint => {
    if (!trendMap.has(date)) {
      trendMap.set(date, { date, llcOrders: 0, totalRevenue: 0 });
    }
    return trendMap.get(date)!;
  };

  llcOrders.forEach((o) => {
    const d = (o.created_at as string).split('T')[0];
    getOrCreate(d).llcOrders++;
  });

  llcRevenueData.forEach((o) => {
    const d = (o.created_at as string).split('T')[0];
    getOrCreate(d).totalRevenue += Number(o.grand_total) || 0;
  });

  // Fill in missing days in the range so the chart shows a continuous x-axis
  const startDate = new Date(start);
  const endDate = new Date(end);
  const current = new Date(startDate);
  while (current <= endDate) {
    const d = current.toISOString().split('T')[0];
    getOrCreate(d);
    current.setDate(current.getDate() + 1);
  }

  const dailyTrend = Array.from(trendMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  return {
    llc: { total: llcTotal, pending: llcPending, inProgress: llcInProgress, formed: llcFormed },
    earnings: { llcRevenue, totalEarnings, llcPercent },
    dailyTrend,
    rangeKey,
    fetchedAt: new Date().toISOString(),
  };
}

export async function getCachedOverviewStats(
  rangeKey: DateRangeFilter,
  startDateStr: string,
  endDateStr: string
): Promise<OverviewStats> {
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

export const getOverviewStats = cache(getCachedOverviewStats);
export { DATE_RANGES } from './dateRanges';
