/**
 * @file src/lib/admin/actions/requestDocumentResubmission.ts
 * @description Server Action to request customer resubmission of an ID/payment document, or cancel it.
 * 
 * FIX 1: Calls rpc('get_my_role') to check admin user role, avoiding direct recursive profiles query.
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidateTag } from 'next/cache';

export async function requestDocumentResubmission(
  orderId: string,
  memberIndex: number | null,
  fieldName: string,
  adminId: string,
  cancel: boolean = false,
  note?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // FIX 1: Retrieve user role via RPC call to prevent infinite RLS recursion
    const { data: role, error: roleError } = await supabase.rpc('get_my_role');
    if (roleError || (role !== 'administrator' && role !== 'manager')) {
      return { success: false, error: 'Unauthorized: Admin role required' };
    }

    if (cancel) {
      // Cancel the pending resubmission request
      let query = (supabase as any)
        .from('document_resubmission_requests')
        .update({
          status: 'cancelled',
          resolved_at: new Date().toISOString(),
          note: note || 'Request cancelled by administrator.',
        })
        .eq('order_id', orderId)
        .eq('field_name', fieldName)
        .eq('status', 'pending');

      if (memberIndex === null) {
        query = query.is('member_index', null);
      } else {
        query = query.eq('member_index', memberIndex);
      }

      const { error } = await query;
      if (error) {
        return { success: false, error: error.message };
      }
    } else {
      // 1. Check if there is already a pending request
      let checkQuery = (supabase as any)
        .from('document_resubmission_requests')
        .select('id')
        .eq('order_id', orderId)
        .eq('field_name', fieldName)
        .eq('status', 'pending');

      if (memberIndex === null) {
        checkQuery = checkQuery.is('member_index', null);
      } else {
        checkQuery = checkQuery.eq('member_index', memberIndex);
      }

      const { data: existing } = await checkQuery.maybeSingle();
      if (existing) {
        return { success: false, error: 'A pending resubmission request already exists for this slot.' };
      }

      // 2. Create the pending resubmission request row
      const { error: insertError } = await (supabase as any)
        .from('document_resubmission_requests')
        .insert({
          order_id: orderId,
          member_index: memberIndex,
          field_name: fieldName,
          requested_by: adminId,
          requested_at: new Date().toISOString(),
          status: 'pending',
          note: note || `Please re-upload your document for ${fieldName}.`,
        });

      if (insertError) {
        return { success: false, error: insertError.message };
      }
    }

    // 3. Clear relevant cache tags
    revalidateTag(`order-${orderId}`, 'max');
    revalidateTag(`order-resubmit-${orderId}`, 'max');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'An unexpected error occurred' };
  }
}

