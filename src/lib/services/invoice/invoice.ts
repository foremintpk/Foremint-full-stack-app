/**
 * Invoice model: token expansion, line-item build-up, totals and file naming.
 * Shared by the form (live preview of the numbers) and the PDF renderer, so
 * what you see in the browser is exactly what gets printed.
 */
import { getStateFee } from '@/lib/onboarding/getStateFees';
import {
  ADDONS,
  ADVANCE_EXTRA,
  ITIN_ADDON_ID,
  ITIN_ADVANCE,
  ITIN_TERMS,
  DISCOUNT_NOTE_FALLBACK,
  DISCOUNT_NOTE_LABEL,
  FILING_FEE_LINE_LABEL,
  ORDER_TYPES,
  PACKAGES,
  PACKAGE_LINE_LABEL,
  PAYMENT_STATUSES,
  PAYMENT_TERMS,
  STATES,
} from './config';

/**
 * An add-on invented in the form rather than listed in config.ts. Lives for the
 * session only — nothing is persisted. `description` is what the client sees on
 * the invoice; `name` just labels the tickbox in the form.
 */
export type CustomAddon = {
  id: string;
  name: string;
  description: string;
  price: number;
  bonus: boolean;
};

/** Everything the form collects. */
export type InvoiceInput = {
  customerName: string;
  invoiceDate: string;        // ISO yyyy-mm-dd, from the date picker
  invoiceNo: string;          // e.g. LLC-WY-2739 (auto-built, editable)
  orderType: string;          // ORDER_TYPES id
  stateCode: string;          // STATES stateCode
  serviceType: string;        // raw SERVICE_TYPES template
  invoiceBy: string;
  paymentStatus: string;      // PAYMENT_STATUSES id
  packageId: string;
  packagePrice: number;       // editable override of the package price
  filingFee: number;          // editable override of the state fee
  addonIds: string[];
  addonBonus: Record<string, boolean>;  // per-addon "give it free" override
  customAddons: CustomAddon[];          // session-only, invented in the form
  discount: number;
  discountReason: string;
  amountPaid: number;
  paymentTermsTitle: string;
  paymentTermsBody: string;
  itinTermsTitle: string;               // second terms block, ITIN add-on only
  itinTermsBody: string;
  includeCompliancePage: boolean;
};

export type LineItem = {
  description: string;
  qty: number;
  rate: number;
  amount: number;
};

export type Totals = {
  subTotal: number;
  discount: number;
  payment: number;
  finalAmount: number;
};

/* ------------------------------------------------------------------ lookups */

export const findState = (code: string) =>
  STATES.find((s) => s.stateCode === code) ?? STATES[STATES.length - 2];

export const findPackage = (id: string) =>
  PACKAGES.find((p) => p.id === id) ?? PACKAGES[0];

export const findOrderType = (id: string) =>
  ORDER_TYPES.find((o) => o.id === id) ?? ORDER_TYPES[0];

export const findStatusLabel = (id: string) =>
  (PAYMENT_STATUSES.find((s) => s.id === id) ?? PAYMENT_STATUSES[0]).label;

/* ------------------------------------------------------------------ tokens */

/** Replaces {ST} {STATE} {PACKAGE} and any extra tokens passed in. */

/**
 * Turns a state's renewal rule into the sentence page 2 prints.
 *
 * The rules in getStateFees.ts are terse ("Anniversary month", "May 15
 * ($0 under $2.47M revenue)") because they are also read as data. Here they
 * become a sentence a client can act on, with the worked example the original
 * template used for anniversary-based states.
 */
function describeRenewalDue(rule: string, cycle: string): string {
  const every = cycle === 'Biennial' ? 'every two years' : 'every year';

  if (cycle === 'None' || /no annual report/i.test(rule)) {
    return 'This state requires no annual report, so there is nothing to file each year.';
  }

  if (/1st day of anniversary month/i.test(rule)) {
    return `Due ${every} on the 1st day of your LLC's formation anniversary month. ` +
      'Example: If your LLC was formed on July 15, your Annual Report is due on July 1 every year.';
  }
  if (/last day of anniversary month/i.test(rule)) {
    return `Due ${every} on the last day of your LLC's formation anniversary month. ` +
      'Example: If your LLC was formed on July 15, your Annual Report is due on July 31 every year.';
  }
  if (/anniversary quarter/i.test(rule)) {
    return `Due ${every} by the end of the quarter your LLC was formed in. ` +
      'Example: If your LLC was formed on July 15, your Annual Report is due by September 30 every year.';
  }
  if (/anniversary date/i.test(rule)) {
    return `Due ${every} on your LLC's formation anniversary date. ` +
      'Example: If your LLC was formed on July 15, your Annual Report is due on July 15 every year.';
  }
  if (/anniversary month/i.test(rule)) {
    return `Due ${every} by the end of your LLC's formation anniversary month. ` +
      'Example: If your LLC was formed on July 15, your Annual Report is due by July 31 every year.';
  }

  // A fixed calendar date, e.g. "May 15 ($0 under $2.47M revenue)". The
  // parenthetical is kept — it is the part a Texas client needs to read.
  return `Due ${rule} ${every}. Even if no tax is owed, most LLCs must still file the required reports to remain compliant.`;
}

/** The one-line form, for the payment-terms block rather than page 2. */
function shortRenewalDue(rule: string, cycle: string): string {
  if (cycle === 'None' || /no annual report/i.test(rule)) {
    return 'This state requires no annual report.';
  }
  if (/anniversary/i.test(rule)) {
    return `The Annual Report is due on the ${rule.toLowerCase()}.`;
  }
  return `The Annual Report is due ${rule}.`;
}

export function expand(
  template: string,
  input: Pick<InvoiceInput, 'stateCode' | 'packageId'>,
  extra: Record<string, string | number> = {},
): string {
  const state = findState(input.stateCode);
  const pkg = findPackage(input.packageId);
  // Renewal figures come from the state fee table — the single source of truth
  // — so an invoice never carries a hardcoded Wyoming fee for a Texas LLC.
  const fees = getStateFee(state.stateCode);
  const renewalFee = fees ? (fees.renewalFee > 0 ? `$${fees.renewalFee}` : '$0') : '—';
  const renewalDue = fees ? describeRenewalDue(fees.renewalDue, fees.renewalCycle) : '';
  const renewalDueShort = fees ? shortRenewalDue(fees.renewalDue, fees.renewalCycle) : '';

  const tokens: Record<string, string> = {
    ST: state.stateCode,
    STATE: state.stateName,
    PACKAGE: pkg.name,
    RENEWAL_FEE: renewalFee,
    RENEWAL_DUE: renewalDue,
    RENEWAL_DUE_SHORT: renewalDueShort,
    ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, String(v)])),
  };
  return template.replace(/\{(\w+)\}/g, (whole, key) =>
    key in tokens ? tokens[key] : whole,
  );
}

/* ------------------------------------------------- invoice number & filename */

/** Four random digits, 1000-9999. Nothing is stored, so reruns differ. */
export const randomSequence = () => String(Math.floor(1000 + Math.random() * 9000));

/** LLC-WY-2739 — prefix from order type, middle from the selected state. */
export function buildInvoiceNo(orderType: string, stateCode: string, sequence: string) {
  return `${findOrderType(orderType).prefix}-${findState(stateCode).stateCode}-${sequence}`;
}

/** Trailing digits of an invoice number, for the file name. */
export const sequenceOf = (invoiceNo: string) =>
  invoiceNo.trim().split('-').pop() || randomSequence();

/** Windows/macOS-safe: strips the characters neither filesystem accepts. */
const sanitise = (s: string) =>
  s.replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * "Mr. Qaiser - WY Company Formation - Invoice 2739.pdf"
 * Customer name, then state code + service, then the invoice sequence.
 */
export function buildFileName(input: InvoiceInput): string {
  const state = findState(input.stateCode);
  const customer = sanitise(input.customerName) || 'Customer';
  // Service templates read "{ST}- Company Formation"; drop the prefix so the
  // state code is not repeated in the file name.
  const service = sanitise(input.serviceType.replace(/^\{ST\}-\s*/, '')) || 'Invoice';
  return `${customer} - ${state.stateCode} ${service} - Invoice ${sequenceOf(input.invoiceNo)}.pdf`;
}

/* --------------------------------------------------------------- add-ons */

/** Looks an add-on id up in the config list first, then the session-only ones. */
export function findAddon(id: string, custom: CustomAddon[]) {
  return ADDONS.find((a) => a.id === id) ?? custom.find((c) => c.id === id);
}

/** What the client reads: a custom add-on's description, else its name. */
export function addonLabel(addon: { name: string; description?: string }) {
  return addon.description?.trim() || addon.name;
}

/** Ids are only compared within one session, so a counter-free unique is fine. */
export const newCustomAddonId = () =>
  `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/* ------------------------------------------------------------- line items */

export function buildLineItems(input: InvoiceInput): LineItem[] {
  const items: LineItem[] = [];

  // 1. the package, carrying the selected state in its description
  const packagePrice = round2(input.packagePrice);
  items.push({
    description: expand(PACKAGE_LINE_LABEL, input),
    qty: 1,
    rate: packagePrice,
    amount: packagePrice,
  });

  // 2. the state filing fee, as its own line
  const filingFee = round2(input.filingFee);
  if (filingFee > 0) {
    items.push({
      description: expand(FILING_FEE_LINE_LABEL, input),
      qty: 1,
      rate: filingFee,
      amount: filingFee,
    });
  }

  // 3. every ticked add-on, preset or custom, in the order it was ticked.
  //    A bonus add-on still shows its rate but charges nothing.
  for (const id of input.addonIds) {
    const addon = findAddon(id, input.customAddons);
    if (!addon) continue;
    const isBonus = input.addonBonus[id] ?? addon.bonus;
    const label = addonLabel(addon);
    items.push({
      description: isBonus ? `${label} (Bonus)` : label,
      qty: 1,
      rate: round2(addon.price),
      amount: isBonus ? 0 : round2(addon.price),
    });
  }

  // The discount is deliberately NOT a table row: it belongs to the totals
  // panel only. See discountNote() for where its description is printed.
  return items;
}

/**
 * Short line describing why a discount was given, printed inside the totals
 * panel. Empty when there is no discount.
 */
export function discountNote(input: InvoiceInput): string {
  if (round2(input.discount) <= 0) return '';
  const reason = input.discountReason.trim() || DISCOUNT_NOTE_FALLBACK;
  return DISCOUNT_NOTE_LABEL.replace('{REASON}', reason);
}

/* ---------------------------------------------------------------- totals */

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

export function computeTotals(input: InvoiceInput): Totals {
  const items = buildLineItems(input);
  const subTotal = round2(items.reduce((sum, i) => sum + i.amount, 0));
  const discount = Math.min(round2(input.discount), subTotal);
  const payment = round2(input.amountPaid);
  return {
    subTotal,
    discount,
    payment,
    finalAmount: round2(subTotal - discount - payment),
  };
}

/* --------------------------------------------------------- payment terms */

/** The extra ITIN terms block only prints when the ITIN add-on is ticked. */
export const itinTermsApply = (input: InvoiceInput) =>
  input.addonIds.includes(ITIN_ADDON_ID);

/**
 * Whether the MAIN terms block is printed.
 *
 * An ITIN order already prints the ITIN terms below, so printing an LLC
 * formation block above it would state terms for work the invoice does not
 * cover. Every other order type keeps its own terms.
 */
export const mainTermsApply = (input: InvoiceInput): boolean =>
  !(input.orderType === 'itin' && itinTermsApply(input));

/**
 * Whether the operator picks the Service Type by hand. The dropdown lists
 * formation wording ("{ST}- Company Formation"), which does not describe a
 * renewal or a standalone ITIN, so the field is hidden on those and the line is
 * derived from the order type instead — see resolveServiceType.
 */
export const serviceTypeApplies = (orderType: string): boolean => orderType === 'llc';

/**
 * The Service Type line as it prints.
 *
 * An ITIN invoice still names the service it is charging for; it just is not
 * the operator's choice, so it is filled in from the order type rather than
 * left to a dropdown that only offers formation wording. A renewal returns
 * empty, which drops the row — the renewal terms and the compliance page
 * already say what it covers.
 */
export function resolveServiceType(input: {
  orderType: string;
  serviceType: string;
}): string {
  if (serviceTypeApplies(input.orderType)) return input.serviceType.trim();
  if (input.orderType === 'itin') return '{ST}- ITIN Application';
  return '';
}

/** Page 2 is the annual-compliance sheet, which an ITIN invoice has no use for. */
export const compliancePageDefault = (orderType: string): boolean => orderType !== 'itin';

/**
 * Second terms block, worked out from the ITIN add-on price: a fixed advance,
 * with the balance following whatever that add-on currently costs.
 */
export function defaultItinTerms(input: InvoiceInput): { title: string; body: string } {
  const addon = findAddon(ITIN_ADDON_ID, input.customAddons);
  const price = round2(addon?.price ?? 0);
  const advance = Math.min(round2(ITIN_ADVANCE), price);
  const extra = {
    ADVANCE: fmtPlain(advance),
    REMAINING: fmtPlain(round2(price - advance)),
    ITIN_PRICE: fmtPlain(price),
  };
  return {
    title: expand(ITIN_TERMS.title, input, extra),
    body: expand(ITIN_TERMS.body, input, extra),
  };
}

/**
 * Default payment-terms wording for the current order type and totals. The
 * form drops this into an editable textarea, so the user can always override.
 */
export function defaultPaymentTerms(input: InvoiceInput): { title: string; body: string } {
  const template = PAYMENT_TERMS[input.orderType] ?? PAYMENT_TERMS.llc;
  const totals = computeTotals(input);
  const total = round2(totals.subTotal - totals.discount);
  const advance = Math.min(round2(input.filingFee + ADVANCE_EXTRA), total);
  const remaining = round2(total - advance);
  const extra = {
    TOTAL: fmtPlain(total),
    ADVANCE: fmtPlain(advance),
    REMAINING: fmtPlain(remaining),
    FILING_FEE: fmtPlain(input.filingFee),
  };
  return {
    title: expand(template.title, input, extra),
    body: expand(template.body, input, extra),
  };
}

/* -------------------------------------------------------------- currency */

/** 220 -> "$220"  (used in the RATE / AMOUNT columns, matching the original) */
export const fmtShort = (n: number) => {
  const v = round2(n);
  return Number.isInteger(v) ? `$${v}` : `$${v.toFixed(2)}`;
};

/** 220 -> "$220.00"  (used in the totals panel) */
export const fmtLong = (n: number) => `$${round2(n).toFixed(2)}`;

/** 220 -> "220" (used inside payment-terms sentences, which add their own $) */
const fmtPlain = (n: number) => {
  const v = round2(n);
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
};

/* ------------------------------------------------------------------ dates */

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** "2026-07-08" -> "08 July 2026", the format used on the original invoice. */
export function formatInvoiceDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return iso;
  const [, year, month, day] = match;
  return `${day} ${MONTHS[Number(month) - 1] ?? month} ${year}`;
}

/** Today as yyyy-mm-dd in local time (not UTC, which can roll the date back). */
export function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
