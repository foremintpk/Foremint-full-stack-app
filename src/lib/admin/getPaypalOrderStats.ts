import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { PaypalOrderStats } from '@/types/admin';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

async function fetchPaypalOrderStats(): Promise<PaypalOrderStats> {
  const supabase = await createClient();

  const runQuery = async (client: SupabaseClient<Database>): Promise<PaypalOrderStats> => {
    const { data, error } = await client
      .from('paypal_orders')
      .select('status, deal_amount');

    if (error) {
      console.error('Error fetching PayPal order stats:', error);
      throw error;
    }

    const rawData = data || [];
    const stats: PaypalOrderStats = {
      totalOrders: rawData.length,
      totalAmount: rawData.reduce((sum, o) => sum + (Number(o.deal_amount) || 0), 0),
      pending:   rawData.filter(o => o.status === 'pending').length,
      completed: rawData.filter(o => o.status === 'completed').length,
      suspended: rawData.filter(o => o.status === 'suspended').length,
      failed:    rawData.filter(o => o.status === 'failed').length,
    };
    return stats;
  };

  return unstable_cache(
    async () => {
      return runQuery(supabase);
    },
    ['paypal-order-stats'],
    {
      revalidate: 60,
      tags: ['paypal-orders', 'paypal-order-stats'],
    }
  )();
}

export const getPaypalOrderStats = cache(fetchPaypalOrderStats);
