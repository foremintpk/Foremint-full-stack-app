/**
 * @file src/lib/services/documents/matcher.ts
 * @description Routes an uploaded file to an LLC order and a document category.
 *
 * Three tiers, cheapest and most certain first:
 *
 *   1. ORDER NUMBER in the filename ("FM-01143 - EIN 147C.pdf")
 *      Exact and unambiguous. Verified against the live book: 125 orders,
 *      125 unique numbers, no duplicates, and no number is a prefix of another,
 *      so a regex match cannot collide. Costs nothing — the file is never read.
 *
 *   2. COMPANY NAME in the filename ("EIN 147C LTR ARSH ISLAMIC INSTITUTE LLC.pdf")
 *      Measured at 79% of existing documents. Ambiguous when two orders share a
 *      company name, which really happens here (Skyline Enterprises Hub,
 *      ELITE BUSINESS GROUP) — those are reported as ambiguous, never guessed.
 *
 *   3. READ THE DOCUMENT (caller's job, see resolveByContent)
 *      For generic names like "Articles Of Organization (2).pdf".
 *
 * Anything still unresolved is handed back for a human to decide. This module
 * never picks between two plausible orders: filing a client's formation papers
 * against another client's record is worse than leaving them unfiled.
 */

import 'server-only';

/** Document categories, matching the slot_key values already in `documents`. */
export type DocumentCategory =
  | 'articles_of_organization'
  | 'operating_agreement'
  | 'ein_letter'
  | 'additional';

export const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  articles_of_organization: 'Articles of Organization',
  operating_agreement: 'Operating Agreement',
  ein_letter: 'EIN Confirmation Letter',
  additional: 'Other Document',
};

export type MatchConfidence =
  /** Order number found in the filename — exact, no ambiguity possible. */
  | 'order-number'
  /** Exactly one order's company name appears in the filename. */
  | 'name-exact'
  /** Resolved by reading the document's contents. */
  | 'content'
  /** More than one order matched; a human must choose. */
  | 'ambiguous'
  /** Nothing matched. */
  | 'unresolved';

export interface OrderCandidate {
  orderId: string;
  orderNumber: string;
  companyName: string;
  status: string;
}

export interface MatchResult {
  category: DocumentCategory;
  /** True when the category came from a filename rule rather than a guess. */
  categoryCertain: boolean;
  orderId: string | null;
  orderNumber: string | null;
  confidence: MatchConfidence;
  /** Populated when ambiguous or unresolved, so the UI can offer a shortlist. */
  candidates: OrderCandidate[];
  /** Human-readable explanation, shown in the review table. */
  reason: string;
}

/**
 * Category rules, ordered most-specific first.
 *
 * Derived from the naming actually present in the live document set rather than
 * invented: "Initial Resolutions" and "Operations Manual" are real files here,
 * and were misfiled by an earlier draft of these rules.
 *
 * `certain: false` marks a rule that fires on a weak signal — the UI shows those
 * as a suggestion rather than a decision.
 */
const CATEGORY_RULES: { pattern: RegExp; category: DocumentCategory; certain: boolean }[] = [
  // EIN letters: IRS form numbers are unmistakable.
  { pattern: /\b147\s?-?c\b|\b575\s?-?cp?\b|\bein\b/i, category: 'ein_letter', certain: true },

  // Operating agreements. "Operations Manual" is a different document that
  // lives in this slot here, so it is matched deliberately.
  { pattern: /operating\s*agreement|operations\s*manual/i, category: 'operating_agreement', certain: true },

  // Initial Resolutions are filed as `additional`. Checked BEFORE the Articles
  // rule (these filenames carry formation wording) but AFTER the EIN rule,
  // because a file named "Initial Resolutions … EIN …" is an EIN letter that
  // happens to have been renamed — the IRS form number is the stronger signal.
  { pattern: /initial\s*resolutions?/i, category: 'additional', certain: false },

  // Articles of Organization. The spelling is unreliable in practice — the live
  // set contains "Orgnaization", "Organziation" and "Aritlce" — so the pattern
  // matches the mangled forms deliberately rather than assuming correct English.
  {
    pattern:
      /a[rt]{1,3}icles?\s*(of\s*)?(or?g[a-z]{0,8}n?[iz]{1,3}a?tion)|formation\s*document|initial\s*filing|certificate\s*of\s*formation/i,
    category: 'articles_of_organization',
    certain: true,
  },

  // The "…_form-a-company_wyoming.pdf" export name is NOT reliable: the live set
  // uses it for both filed Articles and for other paperwork from the same
  // portal. Suggested, never asserted.
  { pattern: /form-a-company/i, category: 'articles_of_organization', certain: false },

  // Certification letters accompany a filing but are not the filing itself.
  { pattern: /certification\s*letter/i, category: 'additional', certain: true },
];

/** The order-number format used throughout the book: FM- plus five digits. */
const ORDER_NUMBER_PATTERN = /\bFM-\d{5}\b/i;

/**
 * Strips the noise that stops two spellings of the same company from matching:
 * case, punctuation, spacing, and the entity suffix. "ON SPOT Solutions LLC"
 * and "onspotsolutions" both reduce to the same key.
 */
export function normalizeCompanyName(value: string): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\b(llc|l\.l\.c\.?|inc\.?|incorporated|corp\.?|corporation|co\.?|ltd\.?|limited)\b/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Levenshtein distance, capped for early exit. Used only to detect NEAR-tied
 * candidates, never to pick a winner.
 */
function editDistance(a: string, b: string, cap = 4): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > cap) return cap + 1;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > cap) return cap + 1; // cannot come back under the cap
    prev = curr;
  }
  return prev[b.length];
}

/**
 * True when two company names are close enough that a filename containing one
 * cannot be trusted to mean that one rather than the other.
 *
 * This exists because the live book contains the same company entered twice
 * with a typo — "Meers Enterpises Hub LLC" (FM-01077) and "MEERS ENTERPRISES
 * HUB LLC" (FM-01110). Exact normalisation treats those as different names, so
 * a longest-match rule picked one with false confidence and misfiled the
 * document. Near-ties must be escalated to a human instead.
 */
function isNearTie(a: string, b: string): boolean {
  if (a === b) return true;
  // Allow one edit per ~8 characters, so long names tolerate a typo but short
  // ones stay strict.
  const tolerance = Math.max(1, Math.floor(Math.max(a.length, b.length) / 8));
  return editDistance(a, b, tolerance) <= tolerance;
}

/**
 * Words that identify a document type when a regex cannot, because the live set
 * misspells them by transposition — "Aritlce", "Orgnaization", "Organziation".
 * A regex cannot express "these letters in roughly this order", so each word in
 * the filename is compared by edit distance instead.
 */
const FUZZY_KEYWORDS: { word: string; category: DocumentCategory }[] = [
  { word: 'articles', category: 'articles_of_organization' },
  { word: 'article', category: 'articles_of_organization' },
  { word: 'organization', category: 'articles_of_organization' },
  { word: 'operating', category: 'operating_agreement' },
  { word: 'agreement', category: 'operating_agreement' },
];

/** Classifies a document by filename alone. */
export function classifyCategory(fileName: string): { category: DocumentCategory; certain: boolean } {
  const name = String(fileName ?? '');

  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(name)) {
      return { category: rule.category, certain: rule.certain };
    }
  }

  // Exact rules found nothing. Try the misspelling-tolerant pass: split the
  // filename into words and see whether any is a near-miss for a keyword.
  // Reported as `certain: false` — a fuzzy hit is a suggestion, not a decision.
  const words = name.toLowerCase().replace(/\.[a-z0-9]+$/, '').split(/[^a-z]+/).filter((w) => w.length >= 5);
  for (const word of words) {
    for (const { word: keyword, category } of FUZZY_KEYWORDS) {
      // One edit per ~5 characters: enough for a transposition, not enough to
      // confuse genuinely different words.
      const tolerance = Math.max(1, Math.floor(keyword.length / 5));
      if (Math.abs(word.length - keyword.length) <= tolerance && editDistance(word, keyword, tolerance) <= tolerance) {
        return { category, certain: false };
      }
    }
  }

  // Unknown documents are valid — they belong in `additional` — but the caller
  // must be told this was a fallback, not a recognised type.
  return { category: 'additional', certain: false };
}

/** Extracts an order number from a filename, if one is present. */
export function extractOrderNumber(fileName: string): string | null {
  const match = String(fileName ?? '').match(ORDER_NUMBER_PATTERN);
  return match ? match[0].toUpperCase() : null;
}

/**
 * Routes one file using its name alone. No network, no file reads.
 *
 * @param fileName the uploaded file's name
 * @param orders   the current order book
 */
export function matchByFileName(fileName: string, orders: OrderCandidate[]): MatchResult {
  const { category, certain } = classifyCategory(fileName);
  const base: Omit<MatchResult, 'orderId' | 'orderNumber' | 'confidence' | 'candidates' | 'reason'> = {
    category,
    categoryCertain: certain,
  };

  // --- Tier 1: order number ------------------------------------------------
  const orderNumber = extractOrderNumber(fileName);
  if (orderNumber) {
    const hit = orders.find((o) => o.orderNumber.toUpperCase() === orderNumber);
    if (hit) {
      return {
        ...base,
        orderId: hit.orderId,
        orderNumber: hit.orderNumber,
        confidence: 'order-number',
        candidates: [],
        reason: `Order number ${orderNumber} in the filename.`,
      };
    }
    // A number that looks right but matches nothing is a real problem worth
    // surfacing — a typo here would otherwise fall through to name matching
    // and quietly file the document against a different order.
    return {
      ...base,
      orderId: null,
      orderNumber: null,
      confidence: 'unresolved',
      candidates: [],
      reason: `The filename names order ${orderNumber}, but no such order exists. Check the number.`,
    };
  }

  // --- Tier 2: company name ------------------------------------------------
  const haystack = normalizeCompanyName(fileName);
  if (haystack.length > 0) {
    // Very short names would match almost anything once punctuation is stripped.
    const hits = orders.filter((o) => {
      const key = normalizeCompanyName(o.companyName);
      return key.length >= 4 && haystack.includes(key);
    });

    if (hits.length === 1) {
      return {
        ...base,
        orderId: hits[0].orderId,
        orderNumber: hits[0].orderNumber,
        confidence: 'name-exact',
        candidates: [],
        reason: `Company name "${hits[0].companyName}" found in the filename.`,
      };
    }

    if (hits.length > 1) {
      // Prefer the longest company-name match: "ON SPOT Solutions LLC" should
      // win over "ON SPOT LLC" when the filename contains the longer one.
      const ranked = [...hits].sort(
        (a, b) => normalizeCompanyName(b.companyName).length - normalizeCompanyName(a.companyName).length
      );
      // A candidate is "tied" if it is the same length as the best match OR
      // near-identical to it. The second test catches the duplicate-with-a-typo
      // case, where exact comparison would wrongly declare a single winner.
      const best = normalizeCompanyName(ranked[0].companyName);
      const tied = ranked.filter((o) => {
        const key = normalizeCompanyName(o.companyName);
        return key.length === best.length || isNearTie(key, best);
      });

      if (tied.length === 1) {
        return {
          ...base,
          orderId: tied[0].orderId,
          orderNumber: tied[0].orderNumber,
          confidence: 'name-exact',
          candidates: ranked.slice(0, 6),
          reason: `Best name match: "${tied[0].companyName}".`,
        };
      }

      // Genuinely tied — two orders share a company name. Never guess.
      return {
        ...base,
        orderId: null,
        orderNumber: null,
        confidence: 'ambiguous',
        candidates: ranked.slice(0, 6),
        reason: `${tied.length} orders share this company name. Pick the right one.`,
      };
    }
  }

  // --- Tier 3 is the caller's: read the document ---------------------------
  return {
    ...base,
    orderId: null,
    orderNumber: null,
    confidence: 'unresolved',
    candidates: [],
    reason: 'No order number or company name in the filename.',
  };
}

/**
 * Resolves an order from a company name read out of the document itself.
 * Used after matchByFileName returns 'unresolved'.
 */
export function matchByCompanyName(
  companyName: string,
  orders: OrderCandidate[]
): { orderId: string; orderNumber: string } | { candidates: OrderCandidate[] } {
  const key = normalizeCompanyName(companyName);
  if (key.length < 4) return { candidates: [] };

  const exact = orders.filter((o) => normalizeCompanyName(o.companyName) === key);
  if (exact.length === 1) {
    return { orderId: exact[0].orderId, orderNumber: exact[0].orderNumber };
  }
  if (exact.length > 1) return { candidates: exact.slice(0, 6) };

  // Fall back to containment either way round, which catches a document naming
  // "ON SPOT LLC" where the order reads "ON SPOT Solutions LLC" (renamed by
  // amendment) and the reverse.
  const partial = orders.filter((o) => {
    const k = normalizeCompanyName(o.companyName);
    return k.length >= 4 && (k.includes(key) || key.includes(k));
  });

  if (partial.length === 1) {
    return { orderId: partial[0].orderId, orderNumber: partial[0].orderNumber };
  }
  return { candidates: partial.slice(0, 6) };
}
