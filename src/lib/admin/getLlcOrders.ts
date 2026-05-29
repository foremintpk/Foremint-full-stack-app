/**
 * @file src/lib/admin/getLlcOrders.ts
 * @description Highly optimized LLC registrations list fetcher featuring dual-route caching.
 * Searches bypass the unstable_cache layer and execute directly against full-text tsvector indices.
 *
 * FIX (Next.js 15+): cookies() must NOT be called inside unstable_cache().
 * createClient() is now called OUTSIDE the cache boundary and the client
 * is passed into runQuery via parameter — not as a cache key arg.
 */

import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { LlcListFilters, LlcListResult, LlcOrderRow, LlcOrderStatus, PaymentStatus } from '@/types/admin';
import { DATE_RANGES } from './dateRanges';
import { formatLlcName } from './formatters';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

interface PostgrestOrderRow {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  grand_total: number;
  formation_state_name: string | null;
  form_snapshot: unknown;
  created_at: string;
  submitted_at: string | null;
  profiles: {
    full_name: string | null;
    email: string;
  } | {
    full_name: string | null;
    email: string;
  }[] | null;
  admin_order_views: { id: string }[] | { id: string } | null;
}

async function fetchLlcOrders(
  filters: LlcListFilters,
  adminId: string
): Promise<LlcListResult> {
  // createClient() (which calls cookies()) lives OUTSIDE unstable_cache — required by Next.js 15+
  const supabase = await createClient();

  const runQuery = async (client: SupabaseClient<Database>): Promise<LlcListResult> => {
    // 1. Calculate offset
    const offset = (filters.page - 1) * filters.pageSize;

    // 2. Select matching LLC orders with profiles join and admin_order_views join
    let query = client
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        payment_status,
        grand_total,
        formation_state_name,
        form_snapshot,
        created_at,
        submitted_at,
        profiles!user_id ( full_name, email ),
        admin_order_views!left ( id )
      `, { count: 'exact' })
      .ilike('order_type', '%llc%')
      .eq('admin_order_views.admin_id', adminId);

    // Apply conditional filters
    if (filters.status !== 'all') {
      let dbStatus: string = filters.status;
      if (filters.status === 'processing') dbStatus = 'in_progress';
      else if (filters.status === 'formed') dbStatus = 'completed';
      query = query.eq('status', dbStatus as any);
    }

    if (filters.dateFilter !== 'all') {
      const range = DATE_RANGES.find((r) => r.key === filters.dateFilter);
      if (range) {
        query = query
          .gte('created_at', range.startDate().toISOString())
          .lte('created_at', range.endDate().toISOString());
      }
    }

    if (filters.q) {
      // Use full-text search with GIN index
      query = query.textSearch('search_vector', filters.q, {
        config: 'english',
        type: 'websearch',
      });
    }

    // Apply sort & pagination
    query = query
      .order(filters.sort, { ascending: filters.dir === 'asc' })
      .range(offset, offset + filters.pageSize - 1);

    const { data, count, error } = await query;
    if (error) {
      console.error('Error fetching LLC order list:', error);
    }

    const rows = (data as unknown as PostgrestOrderRow[]) || [];
    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / filters.pageSize);

    // Map each postgrest row to strict LlcOrderRow type
    const orders: LlcOrderRow[] = rows.map((row) => {
      // Handle potential single vs array profile structures
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      const clientName = profile?.full_name ?? null;
      const clientEmail = profile?.email ?? '';

      // Safely extract businessName from snapshot
      let rawBusinessName: string | null = null;
      if (row.form_snapshot && typeof row.form_snapshot === 'object') {
        const snapshot = row.form_snapshot as Record<string, unknown>;
        if (typeof snapshot.businessName === 'string') {
          rawBusinessName = snapshot.businessName;
        }
      }

      // Check unread views match
      const views = Array.isArray(row.admin_order_views)
        ? row.admin_order_views
        : row.admin_order_views
        ? [row.admin_order_views]
        : [];
      const isNew = views.length === 0;

      const grandTotal = Number(row.grand_total) || 0;

      // Translate database status to visual LlcOrderStatus
      let llcStatus: LlcOrderStatus = 'pending';
      if (row.status === 'in_progress') llcStatus = 'processing';
      else if (row.status === 'completed' || row.status === 'confirmed') llcStatus = 'formed';
      else if (row.status === 'cancelled') llcStatus = 'cancelled';

      return {
        id: row.id,
        orderNumber: row.order_number,
        clientName,
        clientEmail,
        llcName: formatLlcName(rawBusinessName),
        status: llcStatus,
        paymentStatus: row.payment_status as PaymentStatus,
        pendingAmount: row.payment_status !== 'paid' ? grandTotal : 0,
        formationState: row.formation_state_name,
        createdAt: row.created_at,
        submittedAt: row.submitted_at,
        isNew,
      };
    });

    // Fetch stats for active date range filter
    const statsQuery = client
      .from('orders')
      .select('status')
      .ilike('order_type', '%llc%');

    let dateStatsQuery = statsQuery;
    if (filters.dateFilter !== 'all') {
      const range = DATE_RANGES.find((r) => r.key === filters.dateFilter);
      if (range) {
        dateStatsQuery = dateStatsQuery
          .gte('created_at', range.startDate().toISOString())
          .lte('created_at', range.endDate().toISOString());
      }
    }

    const { data: statsData, error: statsError } = await dateStatsQuery;
    if (statsError) {
      console.error('Error fetching list controls stats:', statsError);
    }

    const statsRaw = statsData || [];
    const statsTotal = statsRaw.length;
    let pending = 0;
    let processing = 0;
    let formed = 0;

    statsRaw.forEach((s) => {
      const st = s.status;
      if (st === 'pending') pending++;
      else if (st === 'in_progress') processing++;
      else if (st === 'completed' || st === 'confirmed') formed++;
    });

    return {
      orders,
      totalCount,
      totalPages,
      filters,
      stats: {
        total: statsTotal,
        pending,
        processing,
        formed,
      },
    };
  };

  // If search q is active, bypass caching completely to prevent stale text matching
  if (filters.q) {
    return runQuery(supabase);
  }

  // Compute cache filter key
  const filterKey = [
    filters.status !== 'all' ? `status:${filters.status}` : '',
    filters.dateFilter !== 'all' ? `date:${filters.dateFilter}` : '',
    `page:${filters.page}`,
    `size:${filters.pageSize}`,
    `sort:${filters.sort}_${filters.dir}`,
  ].filter(Boolean).join('_') || 'all';

  return unstable_cache(
    async (fk: string): Promise<LlcListResult> => {
      return runQuery(supabase);
    },
    [`order-list-llc-${filterKey}`],
    {
      revalidate: 60,
      tags: ['order-list-llc', `order-list-llc-${filterKey}`],
    }
  )(filterKey);
}

export const getLlcOrders = cache(fetchLlcOrders);
