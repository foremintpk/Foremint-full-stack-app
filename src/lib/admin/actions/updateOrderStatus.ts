/**
 * @file src/lib/admin/actions/updateOrderStatus.ts
 * @description Server Action to update the status of an order and record history.
 * 
 * FIX 1: Calls rpc('get_my_role') to check admin user role, avoiding direct recursive profiles query.
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidateTag } from 'next/cache';

export async function updateOrderStatus(
  orderId: string,
  newStatus: string,
  adminId: string,
  note?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // FIX 1: Retrieve user role via RPC call to prevent infinite RLS recursion
    const { data: role, error: roleError } = await supabase.rpc('get_my_role');
    if (roleError || (role !== 'administrator' && role !== 'manager')) {
      return { success: false, error: 'Unauthorized: Admin role required' };
    }

    // 1. Fetch current order status to record the history change
    const { data: order, error: orderError } = await (supabase as any)
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return { success: false, error: 'Order not found' };
    }

    const oldStatus = order.status;

    // 2. Perform the order status update
    const { error: updateError } = await (supabase as any)
      .from('orders')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // 3. Insert history audit log row
    const { error: historyError } = await (supabase as any)
      .from('order_status_history')
      .insert({
        order_id: orderId,
        changed_by: adminId,
        old_status: oldStatus,
        new_status: newStatus,
        note: note || `Status updated to ${newStatus} by admin.`,
        changed_at: new Date().toISOString(),
      });

    if (historyError) {
      console.error('[updateOrderStatus History Error]:', historyError);
    }

    // 4. Invalidate relevant caches to trigger instant UI refresh
    (revalidateTag as any)(`order-${orderId}`);
    (revalidateTag as any)('order-list-llc');
    (revalidateTag as any)('order-list-llc-stats');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'An unexpected error occurred' };
  }
}

