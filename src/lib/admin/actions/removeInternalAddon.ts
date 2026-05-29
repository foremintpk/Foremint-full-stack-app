/**
 * @file src/lib/admin/actions/removeInternalAddon.ts
 * @description Server Action to soft-delete a manually assigned internal addon from an order.
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidateOrder } from './revalidateOrder';

export async function removeInternalAddon(
  addonAssignmentId: string,
  orderId: string,
  adminId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // 1. Enforce RBAC access check
    const { data: role, error: roleError } = await supabase.rpc('get_my_role');
    if (roleError || (role !== 'administrator' && role !== 'manager')) {
      return { success: false, error: 'Unauthorized: Admin or Manager role required' };
    }

    // 2. Perform soft-delete by setting removed_at to current timestamp
    const { error: updateError } = await (supabase as any)
      .from('order_internal_addons')
      .update({
        removed_at: new Date().toISOString(),
      } as any)
      .eq('id', addonAssignmentId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // 3. Log into audit logs
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        actor_id: adminId,
        action: 'remove_internal_addon',
        entity_type: 'order',
        entity_id: orderId,
        metadata: {
          assignment_id: addonAssignmentId,
          removed_at: new Date().toISOString(),
        },
      });

    if (auditError) {
      console.error('[removeInternalAddon Audit Log Error]:', auditError);
    }

    // 4. Bust relevant cache tags
    await revalidateOrder(orderId);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'An unexpected error occurred' };
  }
}
