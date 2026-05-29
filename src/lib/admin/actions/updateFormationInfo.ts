/**
 * @file src/lib/admin/actions/updateFormationInfo.ts
 * @description Server Action to override formation details and automatically recalculate order totals.
 * 
 * FIX 1: Calls rpc('get_my_role') to check admin user role, avoiding direct recursive profiles query.
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidateTag } from 'next/cache';

interface FormationInfoPayload {
  businessName: string;
  secondaryBusinessName?: string;
  businessWebsite?: string;
  businessCategory?: string;
  businessDescription?: string;
  entityType: string;
  memberType: string;
  formationState: string; // state code e.g. "TX"
  formationPackage: string;
}

export async function updateFormationInfo(
  orderId: string,
  payload: FormationInfoPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // FIX 1: Retrieve user role via RPC call to prevent infinite RLS recursion
    const { data: role, error: roleError } = await supabase.rpc('get_my_role');
    if (roleError || (role !== 'administrator' && role !== 'manager')) {
      return { success: false, error: 'Unauthorized: Admin role required' };
    }

    // 1. Fetch current order details to recalculate totals
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('state_fee, addons_total, package_price, form_snapshot')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return { success: false, error: 'Order not found' };
    }

    // Import US_STATES to dynamically resolve state fees and name overrides
    const { US_STATES } = await import('@/lib/onboarding-data');
    const matchedState = US_STATES.find(s => s.abbreviation.toLowerCase() === payload.formationState.toLowerCase());

    const newStateFee = matchedState ? matchedState.filingFee : Number(order.state_fee || 0);
    const newStateName = matchedState ? matchedState.name : '';

    let newPackagePrice = Number(order.package_price || 0);
    const { data: dbPackage } = await supabase
      .from('packages')
      .select('*')
      .eq('id', payload.formationPackage)
      .maybeSingle();

    if (dbPackage) {
      newPackagePrice = Number(dbPackage.price);
    } else {
      const packagePrices: Record<string, number> = {
        standard: 120,
        advanced: 170,
      };
      const packageKey = payload.formationPackage?.toLowerCase() || 'standard';
      newPackagePrice = packagePrices[packageKey] ?? Number(order.package_price || 0);
    }

    const addonsTotal = Number(order.addons_total || 0);
    const grandTotal = newPackagePrice + newStateFee + addonsTotal;

    // Build updated form_snapshot for businessName updates
    const currentFormSnapshot = (order.form_snapshot as Record<string, any>) || {};
    const updatedFormSnapshot = {
      ...currentFormSnapshot,
      step2: {
        ...(currentFormSnapshot.step2 || {}),
        state: payload.formationState,
        stateName: newStateName,
        package: payload.formationPackage,
        stateFee: newStateFee,
        packagePrice: newPackagePrice,
      },
      step3: {
        ...(currentFormSnapshot.step3 || {}),
        businessName: payload.businessName,
        secondaryBusinessName: payload.secondaryBusinessName ?? '',
        businessWebsite: payload.businessWebsite ?? '',
        businessCategory: payload.businessCategory ?? '',
        businessDescription: payload.businessDescription ?? '',
      },
      businessName: payload.businessName,
      secondaryBusinessName: payload.secondaryBusinessName ?? '',
      businessWebsite: payload.businessWebsite ?? '',
      businessCategory: payload.businessCategory ?? '',
      businessDescription: payload.businessDescription ?? '',
    };

    // 2. Perform the update with overrides and updated form_snapshot
    const { error: updateError } = await (supabase as any)
      .from('orders')
      .update({
        admin_override_entity_type: payload.entityType,
        admin_override_member_type: payload.memberType,
        admin_override_formation_package: payload.formationPackage,
        formation_state: payload.formationState,
        formation_state_name: newStateName,
        state_fee: newStateFee,
        package_price: newPackagePrice,
        grand_total: grandTotal,
        form_snapshot: updatedFormSnapshot as any,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // 3. Invalidate caches
    revalidateTag(`order-${orderId}`, 'max');
    revalidateTag('order-list-llc', 'max');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'An unexpected error occurred' };
  }
}
