/**
 * @file src/lib/admin/getAssignableOrders.ts
 * @description Returns every LLC order as an option for the admin's B2B
 * assignment multi-select. Admin-only — reads via the service-role client.
 */

import { cache } from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatLlcName } from './formatters';
import { AssignableOrder } from '@/types/admin';

async function fetchAssignableOrders(): Promise<AssignableOrder[]> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from('orders')
    .select(`
      id,
      order_number,
      form_snapshot,
      profiles!user_id ( full_name, email )
    `)
    .ilike('order_type', '%llc%')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getAssignableOrders] error:', error);
    return [];
  }

  return (data || []).map((row: any) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const snapshot = (row.form_snapshot as Record<string, any>) || {};
    const rawBusinessName =
      snapshot?.step3?.businessName ?? snapshot?.businessName ?? '';

    return {
      id: row.id,
      orderNumber: row.order_number || `ORD-${String(row.id).slice(0, 8).toUpperCase()}`,
      llcName: formatLlcName(rawBusinessName || `Order ${row.order_number}`),
      ownerName: profile?.full_name ?? null,
      ownerEmail: profile?.email ?? null,
    };
  });
}

export const getAssignableOrders = cache(fetchAssignableOrders);
