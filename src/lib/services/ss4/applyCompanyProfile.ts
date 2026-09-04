/**
 * @file src/lib/services/ss4/applyCompanyProfile.ts
 * @description Writes a reviewed company profile into `companies`.
 *
 * Separate from buildCompanyProfile on purpose: reading documents is safe and
 * repeatable, writing to a client's record is neither. Nothing here runs until
 * an administrator has seen the values.
 *
 * Two guarantees:
 *   - A field in conflict is never written unless it was explicitly overridden.
 *   - Every change is written to audit_logs with the sources it came from, so a
 *     value can be traced back to the document it was read from.
 */

import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveRenewalDate } from '@/lib/onboarding/resolveRenewalDate';
import { normalizeEin } from './extractEinLetter';
import type { CompanyAddress, CompanyProfile } from './companyProfile.service';

/** Fields an administrator may accept or override, keyed as the UI sends them. */
export interface ProfileOverrides {
  companyName?: string | null;
  formationDate?: string | null;
  filingId?: string | null;
  ein?: string | null;
  stateOfFormation?: string | null;
  structure?: 'single_member_llc' | 'multi_member_llc' | null;
  businessAddress?: CompanyAddress | null;
  /** Apply the same address as the mailing address. Defaults to true. */
  mirrorMailingAddress?: boolean;
}

export interface ApplyResult {
  success: boolean;
  companyId?: string;
  applied?: Record<string, unknown>;
  skipped?: string[];
  error?: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Validates a value before it reaches a client record. */
function validate(field: string, value: unknown): string | null {
  switch (field) {
    case 'ein':
      return normalizeEin(String(value)) ? null : 'EIN must be nine digits (XX-XXXXXXX).';
    case 'formation_date':
      if (!ISO_DATE.test(String(value))) return 'Formation date must be YYYY-MM-DD.';
      if (Number.isNaN(Date.parse(String(value)))) return 'Formation date is not a real date.';
      // A formation date in the future is almost always a misread year.
      if (new Date(String(value)) > new Date(Date.now() + 86400000)) {
        return 'Formation date is in the future.';
      }
      return null;
    case 'state_of_formation':
      return /^[A-Z]{2}$/.test(String(value)) ? null : 'State must be a two-letter code.';
    case 'company_name':
      return String(value).trim().length >= 2 ? null : 'Company name is too short.';
    default:
      return null;
  }
}

/**
 * Applies a profile to the order's company record, creating one if the order
 * has none.
 *
 * @param profile   the reconciled profile from buildCompanyProfile
 * @param overrides values the administrator accepted or corrected
 * @param adminId   for the audit trail
 */
export async function applyCompanyProfile(
  profile: CompanyProfile,
  overrides: ProfileOverrides,
  adminId: string
): Promise<ApplyResult> {
  const db = createAdminClient();

  const { data: orderRow, error: orderError } = await db
    .from('orders')
    .select('id, user_id, company_id')
    .eq('id', profile.orderId)
    .maybeSingle();

  if (orderError) return { success: false, error: `Could not load the order: ${orderError.message}` };
  if (!orderRow) return { success: false, error: 'That order no longer exists.' };

  const order = orderRow as unknown as { id: string; user_id: string; company_id: string | null };

  // Resolve each field: an explicit override wins; otherwise the profile value
  // is used only when it is not in conflict.
  const skipped: string[] = [];
  const patch: Record<string, unknown> = {};

  const take = <T>(
    column: string,
    override: T | null | undefined,
    field: { value: T | null; confidence: string },
    label: string
  ): void => {
    if (override !== undefined && override !== null) {
      patch[column] = override;
      return;
    }
    if (field.confidence === 'conflict') {
      skipped.push(`${label} (sources disagree — needs a decision)`);
      return;
    }
    if (field.value !== null && field.value !== undefined) {
      patch[column] = field.value;
    }
  };

  take('company_name', overrides.companyName, profile.companyName, 'Company name');
  take('formation_date', overrides.formationDate, profile.formationDate, 'Formation date');
  take('filing_id', overrides.filingId, profile.filingId, 'Filing ID');
  take('ein', overrides.ein, profile.ein, 'EIN');
  take('state_of_formation', overrides.stateOfFormation, profile.stateOfFormation, 'State');
  take('structure', overrides.structure, profile.structure, 'Member structure');
  take('business_address', overrides.businessAddress, profile.businessAddress, 'Business address');

  // Normalise the EIN to canonical form regardless of how it was typed.
  if (patch.ein) {
    const canonical = normalizeEin(String(patch.ein));
    if (!canonical) return { success: false, error: 'EIN must be nine digits (XX-XXXXXXX).' };
    patch.ein = canonical;
  }

  // Validate everything before touching the record.
  for (const [column, value] of Object.entries(patch)) {
    const problem = validate(column, value);
    if (problem) return { success: false, error: problem };
  }

  if (overrides.mirrorMailingAddress !== false && patch.business_address) {
    patch.mailing_address = patch.business_address;
  }

  // Renewal is derived, never taken from a document — the state fee table is
  // the source of truth, and it must agree with whatever state we just wrote.
  const state = (patch.state_of_formation ?? profile.stateOfFormation.value) as string | null;
  const formed = (patch.formation_date ?? profile.formationDate.value) as string | null;
  const renewal = resolveRenewalDate(state, formed);
  if (renewal) {
    patch.state_renewal_date = renewal.date;
    patch.state_renewal_fees = renewal.fee;
  }

  if (Object.keys(patch).length === 0) {
    return { success: false, error: 'Nothing to apply — every field was missing or in conflict.' };
  }

  // --- Ensure a company record exists --------------------------------------
  let companyId = order.company_id;
  if (!companyId) {
    const { data: created, error: createError } = await db
      .from('companies')
      .insert({
        owner_id: order.user_id,
        company_name: String(patch.company_name ?? profile.companyName.value ?? 'Unnamed LLC'),
      } as never)
      .select('id')
      .single();

    if (createError || !created) {
      return { success: false, error: `Could not create the company record: ${createError?.message}` };
    }
    companyId = (created as { id: string }).id;

    const { error: linkError } = await db
      .from('orders')
      .update({ company_id: companyId } as never)
      .eq('id', order.id);

    if (linkError) {
      return { success: false, error: `Company created but not linked to the order: ${linkError.message}` };
    }
  }

  // --- Capture the previous values for the audit trail ----------------------
  const { data: before } = await db.from('companies').select('*').eq('id', companyId).maybeSingle();

  const { error: updateError } = await db
    .from('companies')
    .update(patch as never)
    .eq('id', companyId);

  if (updateError) {
    return { success: false, error: `Could not update the company: ${updateError.message}` };
  }

  // --- Audit ---------------------------------------------------------------
  // Records which document each value came from, so a figure on a filed form
  // can be traced back to its source months later.
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const [k, v] of Object.entries(patch)) {
    const previous = (before as Record<string, unknown> | null)?.[k];
    if (JSON.stringify(previous) !== JSON.stringify(v)) changes[k] = { from: previous ?? null, to: v };
  }

  if (Object.keys(changes).length > 0) {
    const { error: auditError } = await db.from('audit_logs').insert({
      actor_id: adminId,
      entity_type: 'company',
      entity_id: companyId,
      action: 'document_extraction_applied',
      metadata: {
        orderNumber: profile.orderNumber,
        changes,
        sources: {
          companyName: profile.companyName.sources,
          formationDate: profile.formationDate.sources,
          ein: profile.ein.sources,
          state: profile.stateOfFormation.sources,
          structure: profile.structure.sources,
          address: profile.businessAddress.sources,
        },
        readLog: profile.readLog,
        skipped,
      },
    } as never);

    // A missing audit row must not fail an otherwise-good write, but it is
    // worth knowing about.
    if (auditError) {
      console.error(`[ss4] audit log failed for ${profile.orderNumber}: ${auditError.message}`);
    }
  }

  return { success: true, companyId, applied: patch, skipped };
}
