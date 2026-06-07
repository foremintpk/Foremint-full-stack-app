'use server';

import { revalidateTag } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidateOrder } from './revalidateOrder';

export type BillingEntryType = 'discount' | 'charge' | 'payment';

export interface BillingEntry {
  id: string;
  orderId: string;
  title: string;
  amount: number;
  type: BillingEntryType;
  createdBy: string | null;
  createdAt: string;
}

function mapRow(d: any): BillingEntry {
  return {
    id: d.id,
    orderId: d.order_id,
    title: d.title,
    amount: Number(d.amount),
    type: d.type as BillingEntryType,
    createdBy: d.created_by,
    createdAt: d.created_at,
  };
}

export async function syncOrderPaymentStatus(orderId: string): Promise<void> {
  try {
    const admin = createAdminClient();
    const [{ data: order }, { data: entries }] = await Promise.all([
      admin.from('orders').select('grand_total, user_id').eq('id', orderId).single(),
      admin.from('billing_entries').select('amount, type').eq('order_id', orderId),
    ]);
    if (!order) return;

    const base = Number(order.grand_total);
    let charges = 0, discounts = 0, payments = 0;
    for (const e of entries ?? []) {
      const a = Number(e.amount);
      if (e.type === 'charge') charges += a;
      else if (e.type === 'discount') discounts += a;
      else if (e.type === 'payment') payments += a;
    }

    const effective = base + charges - discounts;
    const pending = Math.max(0, effective - payments);
    const payment_status = pending <= 0 ? 'paid' : payments > 0 ? 'partial' : 'unpaid';

    await admin.from('orders').update({ payment_status, pending_amount_usd: pending } as any).eq('id', orderId);

    // Invalidate CUSTOMER-facing caches so the order detail, billing page, and
    // dashboard list immediately reflect the new pending amount / status.
    revalidateTag(`llc-detail-${orderId}`, 'max');
    const uid = (order as any).user_id;
    if (uid) {
      revalidateTag(`customer-dashboard-${uid}`, 'max');
      revalidateTag(`order-list-${uid}`, 'max');
    }
  } catch {
    // non-critical
  }
}

export async function addBillingEntry(
  orderId: string,
  adminId: string,
  title: string,
  amount: number,
  type: BillingEntryType
): Promise<{ success: boolean; entry?: BillingEntry; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: role, error: roleError } = await supabase.rpc('get_my_role');
    if (roleError || (role !== 'administrator' && role !== 'manager')) {
      return { success: false, error: 'Unauthorized' };
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('billing_entries')
      .insert({ order_id: orderId, title, amount, type, created_by: adminId } as any)
      .select('*')
      .single();

    if (error || !data) return { success: false, error: error?.message ?? 'Insert failed' };

    await syncOrderPaymentStatus(orderId);
    await revalidateOrder(orderId);

    return { success: true, entry: mapRow(data) };
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Unexpected error' };
  }
}

export async function updateBillingEntry(
  entryId: string,
  title: string,
  amount: number,
  type: BillingEntryType
): Promise<{ success: boolean; entry?: BillingEntry; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: role, error: roleError } = await supabase.rpc('get_my_role');
    if (roleError || (role !== 'administrator' && role !== 'manager')) {
      return { success: false, error: 'Unauthorized' };
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('billing_entries')
      .update({ title, amount, type })
      .eq('id', entryId)
      .select('*')
      .single();

    if (error || !data) return { success: false, error: error?.message ?? 'Update failed' };

    await syncOrderPaymentStatus(data.order_id);
    await revalidateOrder(data.order_id);

    return { success: true, entry: mapRow(data) };
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Unexpected error' };
  }
}

export async function getOrderBillingEntries(orderId: string): Promise<BillingEntry[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from('billing_entries')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });
    return (data || []).map(mapRow);
  } catch {
    return [];
  }
}

export async function deleteBillingEntry(
  entryId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: role } = await supabase.rpc('get_my_role');
    if (role !== 'administrator' && role !== 'manager') return { success: false, error: 'Unauthorized' };

    const admin = createAdminClient();
    const { data: entry } = await admin
      .from('billing_entries')
      .select('order_id')
      .eq('id', entryId)
      .single();

    const { error } = await admin.from('billing_entries').delete().eq('id', entryId);
    if (error) return { success: false, error: error.message };

    if (entry?.order_id) {
      await syncOrderPaymentStatus(entry.order_id);
      await revalidateOrder(entry.order_id);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}
