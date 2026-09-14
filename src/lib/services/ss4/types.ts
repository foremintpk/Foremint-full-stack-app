/**
 * @file src/lib/services/ss4/types.ts
 * @description Shared shapes for the SS-4 pipeline.
 *
 * SS4FormData carries only the values that vary per order. Everything else on
 * the form — the LLC checkboxes, the entity-type boxes, the third-party
 * designee block — is baked into the template PDF and left untouched.
 */

export interface SS4FormData {
  companyName: string;
  /** Line 2. Always empty: the order form's "secondary business name" is a
   *  backup formation name, not a DBA. */
  tradeName: string;
  mailingAddress: string;
  city: string;
  state: string;
  zip: string;
  /** Line 6. Carries the mailing address's city, not the true county. */
  county: string;
  responsibleName: string;
  /** ISO yyyy-mm-dd; rendered onto the form as a long date. */
  businessStartDate: string;
  businessActivity: string;
  businessDescription: string;
  /** Already long-form, e.g. "June 2, 2026". */
  signatureDate: string;
}

/** How a generated packet ended up, mirrored by the ss4_status enum. */
export type Ss4Status = 'pending' | 'passed' | 'failed';

/** What triggered a generation run. */
export type Ss4TriggerSource = 'manual' | 'automatic';

/** One EIN-pending order as the batch listing sees it. */
export interface Ss4OrderRow {
  orderId: string;
  orderNumber: string;
  /** Entity name from the order form; the filed Articles override it later. */
  llcName: string;
  /** The main representative — the member, not the account holder. */
  responsibleName: string;
  members: number;
  memberNames: string[];
  articlesUrl: string | null;
  articlesFileName: string | null;
  /** Member's CNIC or passport, used to check the name on line 7a. */
  identityUrl: string | null;
  orderPlacedAt: string | null;
  /** Attempts already sent. 0 means this order has never been submitted. */
  sentAttempts: number;
  /** What the next run would carry. Pinned at 6 once the ladder is exhausted. */
  nextAttempt: number;
  /** True when the ladder is exhausted and further runs reproduce attempt 6. */
  atCap: boolean;
}

/** The outcome of generating one packet. */
export interface Ss4GenerationResult {
  orderId: string;
  orderNumber: string;
  status: Ss4Status;
  companyName: string | null;
  addressUsed: string | null;
  memberCount: number | null;
  attempt: number;
  documentUrl: string | null;
  failureReason: string | null;
  pages: number | null;
  articlesPages: number | null;
}
