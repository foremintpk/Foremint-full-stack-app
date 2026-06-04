/**
 * @file src/lib/admin/actions/updateFormationDetails.ts
 * @description Server Action to update company formation details and log audit records.
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
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

    // 2. Retrieve company_id — use admin client to always get the live row,
    //    bypassing any Next.js data cache that might return a stale company_id.
    const adminDb = createAdminClient();
    const { data: order, error: orderError } = await adminDb
      .from('orders')
      .select('company_id, user_id, form_snapshot')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return { success: false, error: 'Order not found.' };
    }

    let companyId: string = (order as any).company_id;

    // Auto-create company when none is linked (common for new orders)
    if (!companyId) {
      const admin = adminDb;
      const snapshot = (order as any).form_snapshot as Record<string, any> | null ?? {};
      const businessName: string =
        snapshot?.step3?.businessName ??
        snapshot?.businessName ??
        'Unnamed LLC';

      const { data: newCompany, error: createErr } = await admin
        .from('companies')
        .insert({
          owner_id: (order as any).user_id,
          company_name: businessName,
        } as any)
        .select('id')
        .single();

      if (createErr || !newCompany) {
        return { success: false, error: 'Could not create company record: ' + (createErr?.message ?? 'unknown error') };
      }

      // Link the new company to this order (admin client, no RLS interference)
      await adminDb
        .from('orders')
        .update({ company_id: newCompany.id } as any)
        .eq('id', orderId);

      companyId = newCompany.id;
    }

    // 3. Select original values for audit difference tracking
    const { data: oldCompany } = await adminDb
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();

    // 4. Perform the update
    const { error: updateError } = await adminDb
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

    // 6. Write Audit Log — reuse the same admin client (bypasses RLS on audit_logs)
    const { error: auditError } = await adminDb
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
      } as any);

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
