'use server';

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

    await revalidateOrder(orderId);

    return {
      success: true,
      entry: {
        id: (data as any).id,
        orderId: (data as any).order_id,
        title: (data as any).title,
        amount: Number((data as any).amount),
        type: (data as any).type as BillingEntryType,
        createdBy: (data as any).created_by,
        createdAt: (data as any).created_at,
      },
    };
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

    return (data || []).map((d: any) => ({
      id: d.id,
      orderId: d.order_id,
      title: d.title,
      amount: Number(d.amount),
      type: d.type as BillingEntryType,
      createdBy: d.created_by,
      createdAt: d.created_at,
    }));
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
    const { error } = await admin.from('billing_entries').delete().eq('id', entryId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}