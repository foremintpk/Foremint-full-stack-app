/**
 * @file src/lib/services/ss4/companyOverride.ts
 * @description Prefers the verified company record over a raw Articles read
 * when building an SS-4.
 *
 * WHY. Until now the SS-4 was filled straight from the Articles. That is
 * correct for most orders, but the `companies` record can be strictly better:
 *
 *   - It has been cross-checked against the EIN letter and the order form, so a
 *     name or address confirmed by two documents beats one read from a single
 *     scan.
 *   - An administrator may have corrected it by hand — FM-01090's Articles are
 *     an AMENDMENT carrying the amendment's date and ID, and the corrected
 *     record holds the original filing's values.
 *
 * The Articles remain the fallback: an order whose company record is empty, or
 * whose record disagrees on nothing useful, generates exactly as before.
 *
 * Only fields that are actually present override. A half-filled company record
 * never blanks a value the Articles supplied.
 */

import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Extraction } from './extract';

export interface CompanyRecord {
  companyName: string | null;
  formationDate: string | null;
  businessAddress: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  } | null;
  structure: string | null;
}

export interface OverrideResult {
  extraction: Extraction;
  /** Which fields came from the company record rather than the Articles. */
  overridden: string[];
  /** Member count implied by the record, when it states one. */
  memberCountFromRecord: number | null;
}

/** Loads the company record linked to an order, if any. */
export async function getCompanyRecord(orderId: string): Promise<CompanyRecord | null> {
  const db = createAdminClient();

  const { data: order } = await db
    .from('orders')
    .select('company_id')
    .eq('id', orderId)
    .maybeSingle();

  const companyId = (order as { company_id: string | null } | null)?.company_id;
  if (!companyId) return null;

  const { data, error } = await db
    .from('companies')
    .select('company_name, formation_date, business_address, mailing_address, structure')
    .eq('id', companyId)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as unknown as {
    company_name: string | null;
    formation_date: string | null;
    business_address: Record<string, unknown> | null;
    mailing_address: Record<string, unknown> | null;
    structure: string | null;
  };

  // The SS-4 asks for the mailing address; fall back to the business address
  // when only one of the two is populated.
  const address = (row.mailing_address ?? row.business_address) as CompanyRecord['businessAddress'];

  return {
    companyName: row.company_name,
    formationDate: row.formation_date,
    businessAddress: address,
    structure: row.structure,
  };
}

/**
 * Applies the company record over an Articles extraction.
 *
 * An address is only taken as a unit — street, city, state and zip together —
 * because a record holding a street but no city would otherwise produce a form
 * with one line from the record and the next from the Articles.
 */
export function applyCompanyRecord(
  extraction: Extraction,
  record: CompanyRecord | null
): OverrideResult {
  if (!record) {
    return { extraction, overridden: [], memberCountFromRecord: null };
  }

  const overridden: string[] = [];
  const next: Extraction = { ...extraction };

  if (record.companyName?.trim() && record.companyName.trim() !== extraction.companyName) {
    next.companyName = record.companyName.trim();
    overridden.push('legal name');
  }

  if (record.formationDate && record.formationDate !== extraction.formationDate) {
    next.formationDate = record.formationDate;
    overridden.push('formation date');
  }

  const addr = record.businessAddress;
  const street = String(addr?.street ?? '').trim();
  const city = String(addr?.city ?? '').trim();
  const state = String(addr?.state ?? '').trim().toUpperCase();
  const zip = String(addr?.zip ?? '').trim();

  // All four parts must be present; a partial address is worse than the one the
  // Articles already gave us.
  if (street && city && state && zip) {
    const changed =
      street !== extraction.mailingAddress ||
      city !== extraction.city ||
      state !== extraction.state ||
      zip !== extraction.zip;

    if (changed) {
      next.mailingAddress = street;
      next.city = city;
      next.state = state;
      next.zip = zip;
      overridden.push('mailing address');
    }
  }

  const memberCountFromRecord =
    record.structure === 'single_member_llc' ? 1 : record.structure === 'multi_member_llc' ? 2 : null;

  return { extraction: next, overridden, memberCountFromRecord };
}
