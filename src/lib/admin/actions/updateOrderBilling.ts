/**
 * @file src/lib/admin/actions/updateOrderBilling.ts
 * @description Server Action to update order billing overrides and write audit logs.
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidateOrder } from './revalidateOrder';
import type { OrderBilling } from '@/types/admin';

export async function updateOrderBilling(
  orderId: string,
  adminId: string,
  data: Partial<OrderBilling>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // 1. Enforce RBAC access check
    const { data: role, error: roleError } = await supabase.rpc('get_my_role');
    if (roleError || (role !== 'administrator' && role !== 'manager')) {
      return { success: false, error: 'Unauthorized: Admin or Manager role required' };
    }

    // 2. Fetch old order details for audits
    const { data: oldOrder } = await supabase
      .from('orders')
      .select('grand_total_pkr, advance_amount, advance_payment_date, discount_pkr, second_payment_amount')
      .eq('id', orderId)
      .single();

    // 3. Update orders table with billing overrides
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        grand_total_pkr: data.grandTotalPkr,
        advance_amount: data.advanceAmount,
        advance_payment_date: data.advancePaymentDate,
        discount_pkr: data.discountPkr,
        second_payment_amount: data.secondPaymentAmount,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', orderId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // 4. Log differences
    const changedFields: Record<string, { old: any; new: any }> = {};
    if (oldOrder) {
      const mappings = [
        { key: 'grandTotalPkr', dbKey: 'grand_total_pkr' },
        { key: 'advanceAmount', dbKey: 'advance_amount' },
        { key: 'advancePaymentDate', dbKey: 'advance_payment_date' },
        { key: 'discountPkr', dbKey: 'discount_pkr' },
        { key: 'secondPaymentAmount', dbKey: 'second_payment_amount' },
      ];

      for (const item of mappings) {
        const oldVal = (oldOrder as any)[item.dbKey];
        const newVal = (data as any)[item.key];
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          changedFields[item.dbKey] = { old: oldVal, new: newVal };
        }
      }
    }

    // 5. Write audit log
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        actor_id: adminId,
        action: 'update_billing',
        entity_type: 'order',
        entity_id: orderId,
        metadata: {
          changed_fields: changedFields,
          saved_at: new Date().toISOString(),
        },
      });

    if (auditError) {
      console.error('[updateOrderBilling Audit Log Error]:', auditError);
    }

    // 6. Bust cache
    await revalidateOrder(orderId);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'An unexpected error occurred' };
  }
}
