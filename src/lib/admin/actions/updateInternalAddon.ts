'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidateOrder } from './revalidateOrder';

export async function updateInternalAddon(
  addonId: string,
  orderId: string,
  updates: { description?: string | null; status?: string | null }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: role, error: roleError } = await supabase.rpc('get_my_role');
    if (roleError || (role !== 'administrator' && role !== 'manager')) {
      return { success: false, error: 'Unauthorized' };
    }

    const payload: Record<string, unknown> = {};
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.status !== undefined) payload.status = updates.status;

    const { error } = await (supabase as any)
      .from('order_internal_addons')
      .update(payload)
      .eq('id', addonId)
      .eq('order_id', orderId);

    if (error) return { success: false, error: error.message };

    await revalidateOrder(orderId);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Unexpected error' };
  }
}