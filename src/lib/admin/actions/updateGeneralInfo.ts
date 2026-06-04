/**
 * @file src/lib/admin/actions/updateGeneralInfo.ts
 * @description Server Action to update general client details or reassign the order owner.
 * 
 * FIX 1: Calls rpc('get_my_role') to check admin user role, avoiding direct recursive profiles query.
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidateTag } from 'next/cache';

interface GeneralInfoPayload {
  userId?: string;     // Reassign order to another user
  name: string;
  email: string;
  phone: string | null;
}

export async function updateGeneralInfo(
  orderId: string,
  payload: GeneralInfoPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // FIX 1: Retrieve user role via RPC call to prevent infinite RLS recursion
    const { data: role, error: roleError } = await supabase.rpc('get_my_role');
    if (roleError || (role !== 'administrator' && role !== 'manager')) {
      return { success: false, error: 'Unauthorized: Admin role required' };
    }

    // Validate inputs
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!payload.email || !emailRegex.test(payload.email)) {
      return { success: false, error: 'Invalid email address' };
    }

    // Fetch the order to get the current profile association
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('user_id')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return { success: false, error: 'Order not found' };
    }

    const currentOwnerId = order.user_id;

    // 1. If a reassignment userId is provided, reassign order owner
    if (payload.userId && payload.userId !== currentOwnerId) {
      const { error: reassignmentError } = await supabase
        .from('orders')
        .update({
          user_id: payload.userId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (reassignmentError) {
        return { success: false, error: 'Failed to reassign order: ' + reassignmentError.message };
      }
    }

    // 2. Update user profile display attributes
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: payload.name,
        email: payload.email,
        phone: payload.phone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payload.userId || currentOwnerId);

    if (profileError) {
      return { success: false, error: 'Failed to update profile: ' + profileError.message };
    }

    // 3. Invalidate caches
    revalidateTag(`order-${orderId}`, 'max');
    revalidateTag('order-list-llc', 'max');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'An unexpected error occurred' };
  }
}

