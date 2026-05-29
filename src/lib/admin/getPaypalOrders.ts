import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { PaypalOrderFilters, PaypalOrderListResult, PaypalOrder } from '@/types/admin';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

async function fetchPaypalOrders(filters: PaypalOrderFilters): Promise<PaypalOrderListResult> {
  const supabase = await createClient();

  const runQuery = async (client: SupabaseClient<Database>): Promise<PaypalOrderListResult> => {
    const {
      search,
      status,
      type,
      dateRange,
      page = 1,
      pageSize = 25,
    } = filters;

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = client
      .from('paypal_orders')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (search) {
      query = query.or(
        `customer_name.ilike.%${search}%,email.ilike.%${search}%`
      );
    }
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (type && type !== 'all') {
      query = query.eq('type', type);
    }
    if (dateRange && dateRange !== 'all') {
      const days = parseInt(dateRange, 10);
      if (!isNaN(days)) {
        const since = new Date();
        since.setDate(since.getDate() - days);
        query = query.gte('date', since.toISOString().split('T')[0]);
      }
    }

    const { data, count, error } = await query;
    if (error) {
      console.error('Error fetching PayPal orders:', error);
      throw error;
    }

    const orders: PaypalOrder[] = (data || []).map((row: any) => ({
      id: row.id,
      customerName: row.customer_name,
      email: row.email,
      date: row.date,
      dealAmount: Number(row.deal_amount) || 0,
      type: row.type,
      status: row.status,
      notes: row.notes,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    const total = count || 0;
    const totalPages = Math.ceil(total / pageSize);

    return {
      orders,
      total,
      totalPages,
    };
  };

  // If search is active, bypass cache
  if (filters.search) {
    return runQuery(supabase);
  }

  const filterKey = [
    filters.status && filters.status !== 'all' ? `status:${filters.status}` : '',
    filters.type && filters.type !== 'all' ? `type:${filters.type}` : '',
    filters.dateRange && filters.dateRange !== 'all' ? `dateRange:${filters.dateRange}` : '',
    `page:${filters.page || 1}`,
    `pageSize:${filters.pageSize || 25}`,
  ].filter(Boolean).join('_') || 'all';

  return unstable_cache(
    async (fk: string) => {
      return runQuery(supabase);
    },
    [`paypal-orders-${filterKey}`],
    {
      revalidate: 60,
      tags: ['paypal-orders', `paypal-orders-${filterKey}`],
    }
  )(filterKey);
}

export const getPaypalOrders = cache(fetchPaypalOrders);
