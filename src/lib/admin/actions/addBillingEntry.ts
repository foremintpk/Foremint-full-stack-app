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

/**
 * Recompute `orders.pending_amount_usd` / `payment_status` from billing_entries.
 *
 * The stored columns are a denormalised cache of what billing_entries already
 * say. The admin Billing tab computes the figure live and is always right; the
 * order list, customer cards and payment-reminder emails read these columns, so
 * when a sync is missed they show a number that is simply wrong.
 *
 * Returns the outcome instead of swallowing it. A failure here leaves the order
 * quoting a stale balance to the customer, which is a billing error, not the
 * "non-critical" problem the previous silent catch treated it as.
 */
export async function syncOrderPaymentStatus(
  orderId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = createAdminClient();
    const [{ data: order }, { data: entries }] = await Promise.all([
      admin.from('orders').select('grand_total, user_id').eq('id', orderId).single(),
      admin.from('billing_entries').select('amount, type').eq('order_id', orderId),
    ]);
    if (!order) {
      console.error('[syncOrderPaymentStatus] order not found', { orderId });
      return { ok: false, error: 'Order not found' };
    }

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

    const { error: updateError } = await admin
      .from('orders')
      .update({ payment_status, pending_amount_usd: pending } as any)
      .eq('id', orderId);

    if (updateError) {
      console.error('[syncOrderPaymentStatus] order update failed', {
        orderId,
        pending,
        payment_status,
        code: updateError.code,
        message: updateError.message,
      });
      return { ok: false, error: updateError.message };
    }

    // Invalidate CUSTOMER-facing caches so the order detail, billing page, and
    // dashboard list immediately reflect the new pending amount / status.
    revalidateTag(`llc-detail-${orderId}`, 'max');
    revalidateTag(`order-${orderId}`, 'max');
    // The admin list reads the stored column too, so it must be busted here as
    // well or the list keeps quoting the previous balance.
    revalidateTag('order-list-llc', 'max');
    const uid = (order as any).user_id;
    if (uid) {
      revalidateTag(`customer-dashboard-${uid}`, 'max');
      revalidateTag(`order-list-${uid}`, 'max');
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    console.error('[syncOrderPaymentStatus] threw', { orderId, message });
    return { ok: false, error: message };
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
    if (roleError || (role !== 'administrator' && role !== 'manager' && role !== 'account_manager')) {
      return { success: false, error: 'Unauthorized' };
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('billing_entries')
      .insert({ order_id: orderId, title, amount, type, created_by: adminId } as any)
      .select('*')
      .single();

    if (error || !data) return { success: false, error: error?.message ?? 'Insert failed' };

    // The entry is saved; if the derived totals could not be refreshed the
    // admin must know, because the list and any reminder email will quote the
    // previous balance until it is corrected.
    const sync = await syncOrderPaymentStatus(orderId);
    await revalidateOrder(orderId);

    if (!sync.ok) {
      return {
        success: true,
        entry: mapRow(data),
        error: 'Entry saved, but the order total could not be refreshed. Reload the page before sending any payment reminder.',
      };
    }

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
    if (roleError || (role !== 'administrator' && role !== 'manager' && role !== 'account_manager')) {
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

    const sync = await syncOrderPaymentStatus(data.order_id);
    await revalidateOrder(data.order_id);

    if (!sync.ok) {
      return {
        success: true,
        entry: mapRow(data),
        error: 'Entry updated, but the order total could not be refreshed. Reload the page before sending any payment reminder.',
      };
    }

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
    if (role !== 'administrator' && role !== 'manager' && role !== 'account_manager') return { success: false, error: 'Unauthorized' };

    const admin = createAdminClient();
    const { data: entry } = await admin
      .from('billing_entries')
      .select('order_id')
      .eq('id', entryId)
      .single();

    const { error } = await admin.from('billing_entries').delete().eq('id', entryId);
    if (error) return { success: false, error: error.message };

    if (entry?.order_id) {
      const sync = await syncOrderPaymentStatus(entry.order_id);
      await revalidateOrder(entry.order_id);
      if (!sync.ok) {
        return {
          success: true,
          error: 'Entry deleted, but the order total could not be refreshed. Reload the page before sending any payment reminder.',
        };
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}
