/**
 * @file src/lib/admin/getB2BCustomers.ts
 * @description Fetches B2B customers (profiles.role = 'b2b_customer') together with
 * the LLC orders assigned to each. Admin-only — reads via the service-role client
 * after the page-level RBAC check.
 */

import { cache } from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { B2BCustomer } from '@/types/admin';

async function fetchB2BCustomers(): Promise<B2BCustomer[]> {
  const adminClient = createAdminClient();

  const { data: profiles, error } = await adminClient
    .from('profiles')
    .select('id, email, full_name, phone, is_active, created_at')
    .eq('role', 'b2b_customer')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getB2BCustomers] profiles error:', error);
    return [];
  }

  const rows = profiles || [];
  const ids = rows.map((p) => p.id);

  // Map of b2b_user_id -> assigned order ids
  const assignmentsByUser: Record<string, string[]> = {};
  if (ids.length > 0) {
    const { data: assignments, error: aErr } = await adminClient
      .from('b2b_order_assignments')
      .select('b2b_user_id, order_id')
      .in('b2b_user_id', ids);

    if (aErr) {
      console.error('[getB2BCustomers] assignments error:', aErr);
    }
    (assignments || []).forEach((a) => {
      (assignmentsByUser[a.b2b_user_id] ??= []).push(a.order_id);
    });
  }

  return rows.map((p) => {
    const assignedOrderIds = assignmentsByUser[p.id] || [];
    return {
      id: p.id,
      email: p.email || '',
      fullName: p.full_name,
      phone: p.phone,
      isActive: !!p.is_active,
      createdAt: p.created_at,
      assignedOrderIds,
      assignedOrderCount: assignedOrderIds.length,
    };
  });
}

export const getB2BCustomers = cache(fetchB2BCustomers);
