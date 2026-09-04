/**
 * @file src/lib/services/ss4/companyProfile.service.ts
 * @description Builds a verified company profile for one order by reading every
 * document on file and reconciling them against each other.
 *
 * WHY CROSS-SOURCE. No single document answers everything, and any one of them
 * can be wrong or stale:
 *
 *   Articles of Organization  legal name, formation date, filing ID, address
 *   EIN letter (CP575/147C)   EIN, IRS-held name and address, "SOLE MBR"
 *   Order form snapshot       member names and count, business name as typed
 *   Identity document         the responsible party's name as printed on their ID
 *
 * Real failure this guards against: FM-01090's "Articles" are an AMENDMENT, so
 * they carry the amendment's date and ID rather than the original filing's, and
 * the entity name changed. A single-source read would have written the wrong
 * filing ID. Agreement between sources is therefore recorded per field, and
 * anything that disagrees is surfaced rather than silently resolved.
 *
 * Every field carries its own confidence:
 *   'verified'   two or more independent sources agree
 *   'single'     exactly one source had it; plausible but unconfirmed
 *   'conflict'   sources disagree — a human must choose
 *   'missing'    no source had it
 */

import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { extractArticles, type Extraction } from './extract';
import { extractEinLetter, type EinExtraction } from './extractEinLetter';
import { getCachedExtraction, putCachedExtraction } from './state';
import { resolveRenewalDate } from '@/lib/onboarding/resolveRenewalDate';

export type FieldConfidence = 'verified' | 'single' | 'conflict' | 'missing';

export interface ProfileField<T> {
  value: T | null;
  confidence: FieldConfidence;
  /** Which documents contributed, e.g. ['articles', 'ein-letter']. */
  sources: string[];
  /** Populated when confidence is 'conflict'. */
  alternatives?: { value: T; source: string }[];
  note?: string;
}

export interface CompanyProfile {
  orderId: string;
  orderNumber: string;
  companyName: ProfileField<string>;
  formationDate: ProfileField<string>;
  filingId: ProfileField<string>;
  ein: ProfileField<string>;
  stateOfFormation: ProfileField<string>;
  structure: ProfileField<'single_member_llc' | 'multi_member_llc'>;
  businessAddress: ProfileField<CompanyAddress>;
  renewalDate: ProfileField<string>;
  renewalFee: ProfileField<number>;
  /** Documents that were read, and anything that went wrong reading them. */
  readLog: { document: string; status: 'ok' | 'skipped' | 'failed'; detail: string }[];
  /** True when every field is 'verified' or 'single' — nothing in conflict. */
  safeToApply: boolean;
}

export interface CompanyAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

/** Loose comparison — case, punctuation and spacing are not disagreements. */
const norm = (v: unknown): string =>
  String(v ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Company names additionally ignore the entity suffix. */
const normCompany = (v: unknown): string =>
  String(v ?? '')
    .toLowerCase()
    .replace(/\b(llc|l\.l\.c\.?|inc\.?|corp\.?|co\.?|ltd\.?)\b/g, '')
    .replace(/[^a-z0-9]/g, '');

/**
 * Reconciles candidate values from different documents into one field.
 *
 * @param candidates value/source pairs, most authoritative first
 * @param compare    equality test; defaults to loose string comparison
 */
function reconcile<T>(
  candidates: { value: T | null | undefined; source: string }[],
  compare: (a: T, b: T) => boolean = (a, b) => norm(a) === norm(b),
  /** Renders a value for the conflict message; objects need more than String(). */
  describe: (v: T) => string = (v) => String(v)
): ProfileField<T> {
  const present = candidates.filter(
    (c) => c.value !== null && c.value !== undefined && String(c.value).trim() !== ''
  ) as { value: T; source: string }[];

  if (present.length === 0) {
    return { value: null, confidence: 'missing', sources: [] };
  }

  const first = present[0];
  const agreeing = present.filter((c) => compare(c.value, first.value));
  const disagreeing = present.filter((c) => !compare(c.value, first.value));

  if (disagreeing.length > 0) {
    return {
      value: first.value, // the most authoritative source's value, pending review
      confidence: 'conflict',
      sources: agreeing.map((c) => c.source),
      alternatives: disagreeing,
      note: `${present.length} sources disagree. ${first.source} says "${describe(first.value)}"; ${disagreeing
        .map((d) => `${d.source} says "${describe(d.value)}"`)
        .join('; ')}.`,
    };
  }

  return {
    value: first.value,
    confidence: agreeing.length >= 2 ? 'verified' : 'single',
    sources: agreeing.map((c) => c.source),
    note: agreeing.length >= 2 ? `Confirmed by ${agreeing.length} documents.` : `Only ${first.source} has this.`,
  };
}

interface OrderRecord {
  id: string;
  order_number: string | null;
  user_id: string;
  company_id: string | null;
  member_type: string | null;
  formation_state: string | null;
  form_snapshot: Record<string, unknown> | null;
}

interface DocRecord {
  slot_key: string | null;
  document_type: string | null;
  url: string | null;
  file_name: string | null;
}

/**
 * Reads every document on an order and produces a reconciled profile.
 *
 * Never throws for a document-level failure: an unreadable EIN letter leaves
 * the EIN field 'missing' and logs why, rather than losing the fields the other
 * documents did supply.
 */
export async function buildCompanyProfile(orderNumber: string): Promise<CompanyProfile> {
  const db = createAdminClient();

  const { data: orderRow, error } = await db
    .from('orders')
    .select('id, order_number, user_id, company_id, member_type, formation_state, form_snapshot')
    .eq('order_number', orderNumber)
    .maybeSingle();

  if (error) throw new Error(`Could not load ${orderNumber}: ${error.message}`);
  if (!orderRow) throw new Error(`Order ${orderNumber} not found.`);

  const order = orderRow as unknown as OrderRecord;
  const snapshot = order.form_snapshot ?? {};
  const readLog: CompanyProfile['readLog'] = [];

  const { data: docRows } = await db
    .from('documents')
    .select('slot_key, document_type, url, file_name')
    .eq('order_id', order.id)
    .is('superseded_at', null);

  const docs = (docRows ?? []) as unknown as DocRecord[];
  const articlesDoc = docs.find(
    (d) => d.slot_key === 'articles_of_organization' || /article/i.test(d.document_type ?? '')
  );
  const einDoc = docs.find((d) => d.slot_key === 'ein_letter' || /ein/i.test(d.document_type ?? ''));

  // --- Source 1: Articles of Organization ----------------------------------
  let articles: Extraction | null = null;
  if (articlesDoc?.url) {
    try {
      const cached = await getCachedExtraction(articlesDoc.url);
      if (cached) {
        articles = { ...cached, source: 'cache' };
        readLog.push({ document: 'Articles', status: 'ok', detail: 'Read from cache.' });
      } else {
        articles = await extractArticles(articlesDoc.url, '');
        if (!articles.warning) await putCachedExtraction(articlesDoc.url, articles);
        readLog.push({ document: 'Articles', status: 'ok', detail: `Read via ${articles.source}.` });
      }
    } catch (e) {
      readLog.push({
        document: 'Articles',
        status: 'failed',
        detail: e instanceof Error ? e.message : 'Unknown error.',
      });
    }
  } else {
    readLog.push({ document: 'Articles', status: 'skipped', detail: 'No Articles on file.' });
  }

  // --- Source 2: EIN letter -------------------------------------------------
  let ein: EinExtraction | null = null;
  if (einDoc?.url) {
    try {
      ein = await extractEinLetter(einDoc.url);
      readLog.push({ document: 'EIN letter', status: 'ok', detail: `Read via ${ein.source}.` });
    } catch (e) {
      readLog.push({
        document: 'EIN letter',
        status: 'failed',
        detail: e instanceof Error ? e.message : 'Unknown error.',
      });
    }
  } else {
    readLog.push({ document: 'EIN letter', status: 'skipped', detail: 'No EIN letter on file.' });
  }

  // --- Source 3: the order form --------------------------------------------
  const step3 = snapshot.step3 as { businessName?: unknown } | undefined;
  const step4 = snapshot.step4 as { members?: unknown } | undefined;
  const rawMembers = step4?.members ?? snapshot.members;
  const memberNames = Array.isArray(rawMembers)
    ? rawMembers.map((m) => String((m as Record<string, unknown>)?.fullName ?? '').trim()).filter(Boolean)
    : [];
  const formBusinessName = String(step3?.businessName ?? snapshot.businessName ?? '').trim();

  readLog.push({
    document: 'Order form',
    status: 'ok',
    detail: `${memberNames.length || 1} member(s) recorded.`,
  });

  // --- Reconcile ------------------------------------------------------------
  // Order of precedence is deliberate: the filed document outranks the order
  // form, because order-form names are frequently missing the LLC suffix or
  // carry the account holder rather than the entity.
  const companyName = reconcile<string>(
    [
      { value: articles?.companyName, source: 'articles' },
      { value: ein?.legalName, source: 'ein-letter' },
      { value: formBusinessName, source: 'order-form' },
    ],
    (a, b) => normCompany(a) === normCompany(b)
  );

  const formationDate = reconcile<string>([{ value: articles?.formationDate, source: 'articles' }]);

  // The state's own filing identifier, printed on the Articles header as
  // "Original ID" (WY), "File Number" (MT) and so on. Only the Articles carry
  // it — the IRS letter and the order form never do.
  const filingId = reconcile<string>([{ value: articles?.filingId, source: 'articles' }]);

  const einField = reconcile<string>([{ value: ein?.ein, source: 'ein-letter' }]);

  const stateOfFormation = reconcile<string>([
    { value: articles?.state, source: 'articles' },
    { value: order.formation_state, source: 'order-record' },
    { value: ein?.state, source: 'ein-letter' },
  ]);

  // Member type: the IRS "SOLE MBR" marker is the strongest signal, then the
  // member count actually recorded on the order.
  const structureCandidates: { value: 'single_member_llc' | 'multi_member_llc' | null; source: string }[] = [];
  if (ein && ein.memberType !== 'unknown') {
    structureCandidates.push({
      value: ein.memberType === 'single' ? 'single_member_llc' : 'multi_member_llc',
      source: 'ein-letter',
    });
  }
  if (memberNames.length > 0) {
    structureCandidates.push({
      value: memberNames.length > 1 ? 'multi_member_llc' : 'single_member_llc',
      source: 'order-form',
    });
  }
  if (order.member_type) {
    structureCandidates.push({
      value: /multi/i.test(order.member_type) ? 'multi_member_llc' : 'single_member_llc',
      source: 'order-record',
    });
  }
  const structure = reconcile(structureCandidates);

  const addressCandidates: { value: CompanyAddress | null; source: string }[] = [];
  if (articles?.mailingAddress) {
    addressCandidates.push({
      value: {
        street: articles.mailingAddress,
        city: articles.city,
        state: articles.state,
        zip: articles.zip,
        country: 'USA',
      },
      source: 'articles',
    });
  }
  if (ein?.addressLine) {
    addressCandidates.push({
      value: { street: ein.addressLine, city: ein.city, state: ein.state, zip: ein.zip, country: 'USA' },
      source: 'ein-letter',
    });
  }
  // Addresses are compared loosely on purpose. The state filing and the IRS
  // record describe the same place in different ways, and treating those as
  // disagreements would flag almost every order for review:
  //   - suite formats differ    "30 N Gould St # 48779" vs "30 N GOULD ST 48779"
  //   - ZIP+4 vs 5-digit ZIP    "59901-1498" vs "59901"
  // Only the 5-digit ZIP is compared, and the street is compared on its digits
  // and leading words rather than character-for-character.
  const businessAddress = reconcile<CompanyAddress>(
    addressCandidates,
    (a, b) => {
      const zip5 = (z: string) => String(z ?? '').replace(/\D/g, '').slice(0, 5);
      if (zip5(a.zip) !== zip5(b.zip)) return false;
      if (norm(a.city) !== norm(b.city)) return false;
      // Street match: identical once normalised, or one contains the other
      // (which covers a missing/extra suite designator).
      const sa = norm(a.street);
      const sb = norm(b.street);
      return sa === sb || sa.includes(sb) || sb.includes(sa);
    },
    (v) => [v.street, v.city, v.state, v.zip].filter(Boolean).join(', ')
  );

  // --- Derived: renewal, from the state fee source of truth -----------------
  const renewal = resolveRenewalDate(stateOfFormation.value, formationDate.value);
  const renewalDate: ProfileField<string> = renewal?.date
    ? {
        value: renewal.date,
        confidence: stateOfFormation.confidence === 'conflict' ? 'conflict' : 'single',
        sources: ['state-fee-table'],
        note: `${renewal.rule} (${renewal.cycle.toLowerCase()}).`,
      }
    : { value: null, confidence: 'missing', sources: [], note: renewal?.rule };

  const renewalFee: ProfileField<number> = renewal
    ? { value: renewal.fee, confidence: 'single', sources: ['state-fee-table'] }
    : { value: null, confidence: 'missing', sources: [] };

  const fields = [companyName, formationDate, einField, stateOfFormation, structure, businessAddress];
  const safeToApply = fields.every((f) => f.confidence !== 'conflict');

  return {
    orderId: order.id,
    orderNumber: order.order_number ?? orderNumber,
    companyName,
    formationDate,
    filingId,
    ein: einField,
    stateOfFormation,
    structure,
    businessAddress,
    renewalDate,
    renewalFee,
    readLog,
    safeToApply,
  };
}
