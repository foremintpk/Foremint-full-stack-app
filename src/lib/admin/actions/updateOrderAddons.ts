/**
 * @file src/lib/admin/actions/updateOrderAddons.ts
 * @description Server Action to toggle addon services on an order, recalculating totals with buildPricingSnapshot.
 * 
 * FIX 1: Calls rpc('get_my_role') to check admin user role, avoiding direct recursive profiles query.
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidateTag } from 'next/cache';
import { buildPricingSnapshot } from '@/lib/pricing';

export async function updateOrderAddons(
  orderId: string,
  selectedAddonIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // FIX 1: Retrieve user role via RPC call to prevent infinite RLS recursion
    const { data: role, error: roleError } = await supabase.rpc('get_my_role');
    if (roleError || (role !== 'administrator' && role !== 'manager')) {
      return { success: false, error: 'Unauthorized: Admin role required' };
    }

    // 1. Fetch current order to get state fee and package price
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('state_fee, package_price')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return { success: false, error: 'Order not found' };
    }

    // 2. Load addon details from database to compute secure/accurate snapshot
    let dbAddonsList: Array<{ id: string; title: string; price: number; billingLabel?: string; priceCents?: number }> = [];

    if (selectedAddonIds.length > 0) {
      const uuidAddonIds = selectedAddonIds.filter((id: string) => id.includes('-'));
      const legacyAddonIds = selectedAddonIds.filter((id: string) => !id.includes('-'));

      if (uuidAddonIds.length > 0) {
        const { data: addonsData } = await supabase
          .from('addons')
          .select('id, name, price')
          .in('id', uuidAddonIds);

        if (addonsData) {
          addonsData.forEach(addon => {
            dbAddonsList.push({
              id: addon.id,
              title: addon.name,
              price: Number(addon.price),
              priceCents: Math.round(Number(addon.price) * 100),
            });
          });
        }
      }

      if (legacyAddonIds.length > 0) {
        const { resolveSelectedAddons } = require('@/lib/pricing');
        const legacyAddons = resolveSelectedAddons(legacyAddonIds);
        legacyAddons.forEach((addon: any) => {
          dbAddonsList.push({
            id: addon.id,
            title: addon.title,
            price: addon.price,
            priceCents: addon.priceCents,
            billingLabel: addon.billingLabel,
          });
        });
      }
    }

    const pricing = buildPricingSnapshot({
      stateFee: Number(order.state_fee || 0),
      packagePrice: Number(order.package_price || 0),
      selectedAddonIds: selectedAddonIds,
      dbAddons: dbAddonsList,
    });

    // 3. Update the order rows with newly computed pricing values
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        selected_addons: selectedAddonIds,
        addons_total: pricing.addonsTotal,
        grand_total: pricing.grandTotal,
        pricing_snapshot: pricing as any,
        addons_snapshot: pricing.addons as any,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // 4. Invalidate caches
    (revalidateTag as any)(`order-${orderId}`);
    (revalidateTag as any)('order-list-llc');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'An unexpected error occurred' };
  }
}

