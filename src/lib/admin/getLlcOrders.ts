/**
 * @file src/lib/admin/getLlcOrders.ts
 * @description Highly optimized LLC registrations list fetcher featuring dual-route caching.
 * Searches bypass the unstable_cache layer and run as incremental `ilike` substring
 * matches, consistent with the other admin lists (addons, users, invoices, paypal).
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

/**
 * Cap on client-profile matches folded into the order search. Each id adds ~37
 * characters to the PostgREST query string, so this keeps the request URL well
 * inside safe limits while still covering any realistic admin lookup.
 */
const PROFILE_MATCH_LIMIT = 100;

interface PostgrestOrderRow {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  grand_total: number;
  pending_amount_usd: number | null;
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
  const supabase = await createClient();

  const runQuery = async (client: SupabaseClient<Database>): Promise<LlcListResult> => {
    const offset = (filters.page - 1) * filters.pageSize;

    let query = client
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        payment_status,
        grand_total,
        pending_amount_usd,
        formation_state_name,
        form_snapshot,
        created_at,
        submitted_at,
        profiles!user_id ( full_name, email ),
        admin_order_views!left ( id )
      `, { count: 'exact' })
      .ilike('order_type', '%llc%')
      .eq('admin_order_views.admin_id', adminId);

    if (filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters.dateFilter !== 'all') {
      const range = DATE_RANGES.find((r) => r.key === filters.dateFilter);
      if (range) {
        query = query
          .gte('created_at', range.startDate().toISOString())
          .lte('created_at', range.endDate().toISOString());
      }
    }

    // Incremental substring search, mirroring the addon/user/invoice lists.
    // The previous `textSearch('search_vector', …)` matched whole tsvector
    // lexemes only, so "a" / "ab" / "abou" returned nothing and results
    // appeared only once the complete word ("about") had been typed.
    if (filters.q) {
      // PostgREST parses `or=(…)` as a CSV expression — strip the characters
      // that would otherwise break out of the filter.
      const term = filters.q.replace(/[,()"\\]/g, ' ').trim();

      if (term) {
        const like = `%${term}%`;

        // The account profile name and the name captured on the order form
        // drift apart constantly (90 of 111 live LLC orders disagree), so both
        // have to be searchable. form_snapshot fields are columns of `orders`
        // and go straight into the OR; `profiles` is a joined table, which
        // PostgREST cannot OR against the parent, so resolve it to user ids.
        const { data: profileMatches, error: profileError } = await client
          .from('profiles')
          .select('id')
          .or(`full_name.ilike.${like},email.ilike.${like}`)
          .limit(PROFILE_MATCH_LIMIT);

        if (profileError) {
          console.error('Error resolving client name matches:', profileError);
        }

        const clauses = [
          `order_number.ilike.${like}`,
          `form_snapshot->>businessName.ilike.${like}`,
          `form_snapshot->>fullName.ilike.${like}`,
          `form_snapshot->>email.ilike.${like}`,
        ];

        const matchedUserIds = (profileMatches ?? []).map((p) => p.id);
        if (matchedUserIds.length > 0) {
          clauses.push(`user_id.in.(${matchedUserIds.join(',')})`);
        }

        query = query.or(clauses.join(','));
      }
    }

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

    const orders: LlcOrderRow[] = rows.map((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      const clientName = profile?.full_name ?? null;
      const clientEmail = profile?.email ?? '';

      let rawBusinessName: string | null = null;
      if (row.form_snapshot && typeof row.form_snapshot === 'object') {
        const snapshot = row.form_snapshot as Record<string, unknown>;
        if (typeof snapshot.businessName === 'string') {
          rawBusinessName = snapshot.businessName;
        }
      }

      const views = Array.isArray(row.admin_order_views)
        ? row.admin_order_views
        : row.admin_order_views
        ? [row.admin_order_views]
        : [];
      const isNew = views.length === 0;

      const grandTotal = Number(row.grand_total) || 0;

      const llcStatus: LlcOrderStatus = (row.status as LlcOrderStatus) || 'pending';

      return {
        id: row.id,
        orderNumber: row.order_number,
        clientName,
        clientEmail,
        llcName: formatLlcName(rawBusinessName),
        status: llcStatus,
        paymentStatus: row.payment_status as PaymentStatus,
        pendingAmount: row.payment_status === 'paid' ? 0 : (row.pending_amount_usd ?? grandTotal),
        formationState: row.formation_state_name,
        createdAt: row.created_at,
        submittedAt: row.submitted_at,
        isNew,
      };
    });

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
    let initialized = 0;
    let submittedInState = 0;
    let einPending = 0;
    let formed = 0;

    statsRaw.forEach((s) => {
      const st = s.status;
      if (st === 'pending') pending++;
      else if (st === 'initialized') initialized++;
      else if (st === 'submitted_in_state') submittedInState++;
      else if (st === 'ein_pending') einPending++;
      else if (st === 'formed') formed++;
    });

    return {
      orders,
      totalCount,
      totalPages,
      filters,
      stats: {
        total: statsTotal,
        pending,
        initialized,
        submittedInState,
        einPending,
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
    async (): Promise<LlcListResult> => {
      return runQuery(supabase);
    },
    [`order-list-llc-${filterKey}`],
    {
      revalidate: 60,
      tags: ['order-list-llc', `order-list-llc-${filterKey}`],
    }
  )();
}

export const getLlcOrders = cache(fetchLlcOrders);
