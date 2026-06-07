'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidateTag } from 'next/cache';

export async function updateAddonStatus(
  orderId: string,
  addonId: string,
  status: string,
  details: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: role, error: roleError } = await supabase.rpc('get_my_role');
    if (roleError || (role !== 'administrator' && role !== 'manager')) {
      return { success: false, error: 'Unauthorized' };
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('addons_snapshot, selected_addons')
      .eq('id', orderId)
      .single();

    if (orderError || !order) return { success: false, error: 'Order not found' };

    const snapshot: any[] = Array.isArray(order.addons_snapshot) ? order.addons_snapshot : [];
    const selectedIds: string[] = Array.isArray(order.selected_addons) ? order.selected_addons : [];

    // Update existing entry or append a new status-only entry
    const existingIdx = snapshot.findIndex((a: any) => a.id === addonId);
    if (existingIdx >= 0) {
      snapshot[existingIdx] = { ...snapshot[existingIdx], status, details };
    } else {
      // Addon is in selected_addons but not in snapshot — add a minimal entry
      if (selectedIds.includes(addonId)) {
        snapshot.push({ id: addonId, status, details });
      } else {
        return { success: false, error: 'Addon not found on this order' };
      }
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({ addons_snapshot: snapshot, updated_at: new Date().toISOString() })
      .eq('id', orderId);

    if (updateError) return { success: false, error: updateError.message };

    revalidateTag(`order-${orderId}`, 'max');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Unexpected error' };
  }
}
