import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { InvoiceFilters, InvoiceListResult, Invoice } from '@/types/admin';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

async function fetchInvoicesQuery(
  supabase: SupabaseClient<Database>,
  filters: InvoiceFilters
): Promise<InvoiceListResult> {
  const { search, dateRange, page = 1, pageSize = 25 } = filters;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('invoices')
    .select('*', { count: 'exact' })
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,invoice_number.ilike.%${search}%`
    );
  }

  if (dateRange && dateRange !== 'all') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (dateRange === 'today') {
      const todayStr = today.toISOString().split('T')[0];
      query = query.eq('date', todayStr);
    } else if (dateRange === 'yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().split('T')[0];
      query = query.eq('date', yStr);
    } else {
      const days = parseInt(dateRange, 10);
      if (!isNaN(days)) {
        const since = new Date(today);
        since.setDate(since.getDate() - days);
        query = query.gte('date', since.toISOString().split('T')[0]);
      }
    }
  }

  const { data, count, error } = await query;
  if (error) {
    console.error('Error fetching invoices:', error);
    throw error;
  }

  const invoices: Invoice[] = (data || []).map((row: any) => ({
    id: row.id,
    invoiceNumber: row.invoice_number,
    date: row.date,
    name: row.name,
    totalAmountPkr: Number(row.total_amount_pkr) || 0,
    commissionEarned: Number(row.commission_earned) || 0,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  const total = count || 0;
  const totalPages = Math.ceil(total / pageSize);

  return {
    invoices,
    total,
    totalPages,
  };
}

async function getCachedInvoices(filters: InvoiceFilters): Promise<InvoiceListResult> {
  // createClient() (which calls cookies()) lives OUTSIDE unstable_cache — required by Next.js 15+
  const supabase = await createClient();

  const filterKey = JSON.stringify(filters);

  return unstable_cache(
    async (fk: string) => {
      return fetchInvoicesQuery(supabase, filters);
    },
    [`invoice-list-${filterKey}`],
    {
      revalidate: 60,
      tags: ['invoice-list', `invoice-list-${filterKey}`],
    }
  )(filterKey);
}

export const getInvoices = cache(getCachedInvoices);
