/**
 * @file src/lib/admin/actions/addInternalAddon.ts
 * @description Server Action to manually assign an internal addon to an order.
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidateOrder } from './revalidateOrder';

interface AddInternalAddonParams {
  orderId: string;
  addonId: string;
  addonName: string;
  addonPrice: number;
  description?: string;
  documentId?: string;
  adminId: string;
}

export async function addInternalAddon({
  orderId,
  addonId,
  addonName,
  addonPrice,
  description,
  documentId,
  adminId,
}: AddInternalAddonParams): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // 1. Enforce RBAC access check
    const { data: role, error: roleError } = await supabase.rpc('get_my_role');
    if (roleError || (role !== 'administrator' && role !== 'manager')) {
      return { success: false, error: 'Unauthorized: Admin or Manager role required' };
    }

    // 2. Insert internal addon row into the database
    const { error: insertError } = await (supabase as any)
      .from('order_internal_addons')
      .insert({
        order_id: orderId,
        addon_id: addonId,
        addon_name: addonName,
        addon_price: addonPrice,
        description: description || null,
        document_id: documentId || null,
        assigned_by: adminId,
        assigned_at: new Date().toISOString(),
      } as any);

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    // 3. Log into audit logs
    const { error: auditError } = await createAdminClient()
      .from('audit_logs')
      .insert({
        actor_id: adminId,
        action: 'add_internal_addon',
        entity_type: 'order',
        entity_id: orderId,
        metadata: {
          addon_id: addonId,
          addon_name: addonName,
          addon_price: addonPrice,
          assigned_at: new Date().toISOString(),
        },
      });

    if (auditError) {
      console.error('[addInternalAddon Audit Log Error]:', auditError);
    }

    // 4. Bust relevant cache tags
    await revalidateOrder(orderId);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'An unexpected error occurred' };
  }
}
