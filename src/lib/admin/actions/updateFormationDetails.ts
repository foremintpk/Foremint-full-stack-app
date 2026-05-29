/**
 * @file src/lib/admin/actions/updateFormationDetails.ts
 * @description Server Action to update company formation details and log audit records.
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidateOrder } from './revalidateOrder';
import type { FormationDetails } from '@/types/admin';

export async function updateFormationDetails(
  orderId: string,
  adminId: string,
  data: FormationDetails
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // 1. Enforce RBAC access check
    const { data: role, error: roleError } = await supabase.rpc('get_my_role');
    if (roleError || (role !== 'administrator' && role !== 'manager')) {
      return { success: false, error: 'Unauthorized: Admin or Manager role required' };
    }

    // 2. Retrieve company_id for this order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('company_id')
      .eq('id', orderId)
      .single();

    if (orderError || !order || !order.company_id) {
      return { success: false, error: 'Linked company not found. Please reload.' };
    }

    const companyId = order.company_id;

    // 3. Select original values for audit difference tracking
    const { data: oldCompany } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();

    // 4. Perform the update
    const { error: updateError } = await supabase
      .from('companies')
      .update({
        ein: data.einNumber,
        filing_id: data.filingId,
        formation_date: data.formationDate,
        state_renewal_date: data.stateRenewalDate,
        state_renewal_fees: data.stateRenewalFees,
        mailing_address: data.mailingAddress as any,
        trading_address: data.tradingAddress as any,
        business_address: data.businessAddress as any,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', companyId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // 5. Build changed fields audit metadata
    const changedFields: Record<string, { old: any; new: any }> = {};
    if (oldCompany) {
      const mappings: { key: keyof FormationDetails; dbKey: string }[] = [
        { key: 'einNumber', dbKey: 'ein' },
        { key: 'filingId', dbKey: 'filing_id' },
        { key: 'formationDate', dbKey: 'formation_date' },
        { key: 'stateRenewalDate', dbKey: 'state_renewal_date' },
        { key: 'stateRenewalFees', dbKey: 'state_renewal_fees' },
        { key: 'mailingAddress', dbKey: 'mailing_address' },
        { key: 'tradingAddress', dbKey: 'trading_address' },
        { key: 'businessAddress', dbKey: 'business_address' },
      ];

      for (const item of mappings) {
        const oldVal = (oldCompany as any)[item.dbKey];
        const newVal = (data as any)[item.key];
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          changedFields[item.dbKey] = { old: oldVal, new: newVal };
        }
      }
    }

    // 6. Write Audit Log
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        actor_id: adminId,
        action: 'update_formation_details',
        entity_type: 'company',
        entity_id: companyId,
        metadata: {
          changed_fields: changedFields,
          saved_at: new Date().toISOString(),
        },
      });

    if (auditError) {
      console.error('[updateFormationDetails Audit Log Error]:', auditError);
    }

    // 7. Revalidate tags and paths
    await revalidateOrder(orderId);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'An unexpected error occurred' };
  }
}
