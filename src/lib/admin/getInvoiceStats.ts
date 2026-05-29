import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { InvoiceStats } from '@/types/admin';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

async function fetchInvoiceStatsQuery(
  supabase: SupabaseClient<Database>
): Promise<InvoiceStats> {
  const { data, error } = await supabase
    .from('invoices')
    .select('total_amount_pkr, commission_earned, date');

  if (error) {
    console.error('Error fetching invoice stats:', error);
    throw error;
  }

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString().split('T')[0];

  const stats: InvoiceStats = {
    totalInvoices: data?.length || 0,
    totalRevenuePkr: (data || []).reduce((s, i) => s + (Number(i.total_amount_pkr) || 0), 0),
    totalCommission: (data || []).reduce((s, i) => s + (Number(i.commission_earned) || 0), 0),
    thisMonthCount: (data || []).filter(i => i.date >= thisMonthStart).length,
  };
  return stats;
}

async function getCachedInvoiceStats(): Promise<InvoiceStats> {
  // createClient() (which calls cookies()) lives OUTSIDE unstable_cache — required by Next.js 15+
  const supabase = await createClient();

  return unstable_cache(
    async () => {
      return fetchInvoiceStatsQuery(supabase);
    },
    ['invoice-stats'],
    {
      revalidate: 60,
      tags: ['invoice-list'],
    }
  )();
}

export const getInvoiceStats = cache(getCachedInvoiceStats);
