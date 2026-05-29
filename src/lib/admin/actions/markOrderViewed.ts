/**
 * @file src/lib/admin/actions/markOrderViewed.ts
 * @description Server Action to register that an admin has viewed a particular order.
 * 
 * FIX 1: Calls rpc('get_my_role') to check admin user role, avoiding direct recursive profiles query.
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidateTag } from 'next/cache';

export async function markOrderViewed(
  orderId: string,
  adminId: string
): Promise<void> {
  try {
    const supabase = await createClient();

    // 1. Double check session role via RPC to prevent unauthorized views logs
    const { data: role, error: roleError } = await supabase.rpc('get_my_role');
    if (roleError || (role !== 'administrator' && role !== 'manager')) {
      console.warn('[markOrderViewed]: Unauthorized attempt');
      return;
    }

    // 2. Query if view record already exists to determine update vs insert path
    const { data: existing, error: selectError } = await (supabase as any)
      .from('admin_order_views')
      .select('id')
      .eq('admin_id', adminId)
      .eq('order_id', orderId)
      .maybeSingle();

    if (selectError) {
      console.error('[markOrderViewed Select Error]:', selectError);
      return;
    }

    if (existing) {
      // Record already exists: update last_viewed_at
      const { error: updateError } = await (supabase as any)
        .from('admin_order_views')
        .update({
          last_viewed_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error('[markOrderViewed Update Error]:', updateError);
      }
    } else {
      // First view: insert new row
      const { error: insertError } = await (supabase as any)
        .from('admin_order_views')
        .insert({
          admin_id: adminId,
          order_id: orderId,
          first_viewed_at: new Date().toISOString(),
          last_viewed_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error('[markOrderViewed Insert Error]:', insertError);
      }
    }

    // 3. Clear badges and list page NEW tag
    (revalidateTag as any)(`unread-orders-${adminId}`);
    (revalidateTag as any)('order-list-llc');
    (revalidateTag as any)(`nav-badges-${adminId}`);
    (revalidateTag as any)(`order-${orderId}`);
  } catch (err) {
    console.error('[markOrderViewed Exception]:', err);
  }
}

