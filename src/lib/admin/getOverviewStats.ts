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
  const [llcRes, paypalRes, llcRevenueRes, paypalRevenueRes, invoiceRes] = await Promise.all([
    supabase
      .from('orders')
      .select('status, created_at')
      .eq('order_type', 'llc')
      .gte('created_at', start)
      .lte('created_at', end),

    supabase
      .from('paypal_orders')
      .select('status, deal_amount, created_at')
      .gte('created_at', start)
      .lte('created_at', end),

    supabase
      .from('orders')
      .select('grand_total, created_at')
      .eq('order_type', 'llc')
      .eq('payment_status', 'paid')
      .gte('created_at', start)
      .lte('created_at', end),

    supabase
      .from('paypal_orders')
      .select('deal_amount, created_at')
      .eq('status', 'completed')
      .gte('created_at', start)
      .lte('created_at', end),

    supabase
      .from('invoices')
      .select('commission_earned, created_at')
      .gte('created_at', start)
      .lte('created_at', end),
  ]);

  if (llcRes.error) console.error('Error fetching LLC stats:', llcRes.error);
  if (paypalRes.error) console.error('Error fetching PayPal stats:', paypalRes.error);
  if (llcRevenueRes.error) console.error('Error fetching LLC revenue:', llcRevenueRes.error);
  if (paypalRevenueRes.error) console.error('Error fetching PayPal revenue:', paypalRevenueRes.error);
  if (invoiceRes.error) console.error('Error fetching Invoice stats:', invoiceRes.error);

  const llcOrders = llcRes.data || [];
  const paypalOrders = paypalRes.data || [];
  const llcRevenueData = llcRevenueRes.data || [];
  const paypalRevenueData = paypalRevenueRes.data || [];
  const invoiceData = invoiceRes.data || [];

  // 1. LLC order counts
  const llcTotal = llcOrders.length;
  let llcPending = 0, llcInProgress = 0, llcFormed = 0;
  llcOrders.forEach((o) => {
    const s = o.status as string;
    if (s === 'pending') llcPending++;
    else if (s === 'initialized' || s === 'submitted_in_state' || s === 'ein_pending') llcInProgress++;
    else if (s === 'formed') llcFormed++;
  });

  // 2. PayPal order counts
  const paypalTotal = paypalOrders.length;
  let paypalPending = 0, paypalProcessing = 0, paypalCompleted = 0;
  paypalOrders.forEach((o) => {
    const s = o.status as string;
    if (s === 'pending') paypalPending++;
    else if (s === 'in_progress') paypalProcessing++;
    else if (s === 'completed') paypalCompleted++;
  });

  // 3. Revenue totals
  const llcRevenue = llcRevenueData.reduce((sum, r) => sum + (Number(r.grand_total) || 0), 0);
  const paypalRevenue = paypalRevenueData.reduce((sum, r) => sum + (Number(r.deal_amount) || 0), 0);
  const invoiceCommissions = invoiceData.reduce((sum, r) => sum + (Number(r.commission_earned) || 0), 0);
  const totalEarnings = llcRevenue + paypalRevenue + invoiceCommissions;

  // 4. Percentages
  let llcPercent = 0, paypalPercent = 0, invoicePercent = 0;
  if (totalEarnings > 0) {
    llcPercent = Math.round((llcRevenue / totalEarnings) * 100);
    paypalPercent = Math.round((paypalRevenue / totalEarnings) * 100);
    invoicePercent = Math.round((invoiceCommissions / totalEarnings) * 100);
    const sum = llcPercent + paypalPercent + invoicePercent;
    if (sum !== 100 && sum > 0) {
      const diff = 100 - sum;
      const maxVal = Math.max(llcPercent, paypalPercent, invoicePercent);
      if (maxVal === llcPercent) llcPercent += diff;
      else if (maxVal === paypalPercent) paypalPercent += diff;
      else invoicePercent += diff;
    }
  }

  // 5. Daily trend — group all records by YYYY-MM-DD
  const trendMap = new Map<string, DailyTrendPoint>();

  const getOrCreate = (date: string): DailyTrendPoint => {
    if (!trendMap.has(date)) {
      trendMap.set(date, { date, llcOrders: 0, paypalOrders: 0, totalRevenue: 0 });
    }
    return trendMap.get(date)!;
  };

  llcOrders.forEach((o) => {
    const d = (o.created_at as string).split('T')[0];
    getOrCreate(d).llcOrders++;
  });

  paypalOrders.forEach((o) => {
    const d = (o.created_at as string).split('T')[0];
    getOrCreate(d).paypalOrders++;
  });

  llcRevenueData.forEach((o) => {
    const d = (o.created_at as string).split('T')[0];
    getOrCreate(d).totalRevenue += Number(o.grand_total) || 0;
  });

  paypalRevenueData.forEach((o) => {
    const d = (o.created_at as string).split('T')[0];
    getOrCreate(d).totalRevenue += Number(o.deal_amount) || 0;
  });

  invoiceData.forEach((o) => {
    const d = (o.created_at as string).split('T')[0];
    getOrCreate(d).totalRevenue += Number(o.commission_earned) || 0;
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
    paypal: { total: paypalTotal, pending: paypalPending, processing: paypalProcessing, completed: paypalCompleted },
    earnings: { llcRevenue, paypalRevenue, invoiceCommissions, totalEarnings, llcPercent, paypalPercent, invoicePercent },
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
