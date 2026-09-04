/* ==========================================================================
   FOREMINT INVOICE - EDITABLE DATA
   --------------------------------------------------------------------------
   Everything the invoice prints lives in this one file. Add, remove or change
   any entry below and restart `npm run dev`; the form and the PDF both pick it
   up automatically. Nothing else needs touching.
   ========================================================================== */

/* -------------------------------------------------------------------------
   1. COMPANY HEADER  (the two grey lines under the logo)
   ------------------------------------------------------------------------- */
export const COMPANY = {
  addressLine: "Office no 3 , 2nd Floor, HBL Plaza Central Block, Bahria Orchard, Lahore",
  contactLine: "www.foremint.pk   +923164466335   support@foremint.pk",
};

/* -------------------------------------------------------------------------
   2. STATES  -  `fee` is the state filing fee, printed as its own line item.
   ------------------------------------------------------------------------- */
export type StateOption = { stateCode: string; stateName: string; fee: number };

export const STATES: StateOption[] = [
  { stateCode: 'AL', stateName: 'Alabama', fee: 200 },
  { stateCode: 'AK', stateName: 'Alaska', fee: 250 },
  { stateCode: 'AZ', stateName: 'Arizona', fee: 50 },
  { stateCode: 'AR', stateName: 'Arkansas', fee: 45 },
  { stateCode: 'CA', stateName: 'California', fee: 70 },
  { stateCode: 'CO', stateName: 'Colorado', fee: 50 },
  { stateCode: 'CT', stateName: 'Connecticut', fee: 120 },
  { stateCode: 'DE', stateName: 'Delaware', fee: 110 },
  { stateCode: 'FL', stateName: 'Florida', fee: 125 },
  { stateCode: 'GA', stateName: 'Georgia', fee: 100 },
  { stateCode: 'HI', stateName: 'Hawaii', fee: 50 },
  { stateCode: 'ID', stateName: 'Idaho', fee: 100 },
  { stateCode: 'IL', stateName: 'Illinois', fee: 150 },
  { stateCode: 'IN', stateName: 'Indiana', fee: 95 },
  { stateCode: 'IA', stateName: 'Iowa', fee: 50 },
  { stateCode: 'KS', stateName: 'Kansas', fee: 160 },
  { stateCode: 'KY', stateName: 'Kentucky', fee: 40 },
  { stateCode: 'LA', stateName: 'Louisiana', fee: 100 },
  { stateCode: 'ME', stateName: 'Maine', fee: 175 },
  { stateCode: 'MD', stateName: 'Maryland', fee: 100 },
  { stateCode: 'MA', stateName: 'Massachusetts', fee: 500 },
  { stateCode: 'MI', stateName: 'Michigan', fee: 50 },
  { stateCode: 'MN', stateName: 'Minnesota', fee: 155 },
  { stateCode: 'MS', stateName: 'Mississippi', fee: 50 },
  { stateCode: 'MO', stateName: 'Missouri', fee: 50 },
  { stateCode: 'MT', stateName: 'Montana', fee: 35 },
  { stateCode: 'NE', stateName: 'Nebraska', fee: 100 },
  { stateCode: 'NV', stateName: 'Nevada', fee: 425 },
  { stateCode: 'NH', stateName: 'New Hampshire', fee: 100 },
  { stateCode: 'NJ', stateName: 'New Jersey', fee: 125 },
  { stateCode: 'NM', stateName: 'New Mexico', fee: 50 },
  { stateCode: 'NY', stateName: 'New York', fee: 200 },
  { stateCode: 'NC', stateName: 'North Carolina', fee: 125 },
  { stateCode: 'ND', stateName: 'North Dakota', fee: 135 },
  { stateCode: 'OH', stateName: 'Ohio', fee: 99 },
  { stateCode: 'OK', stateName: 'Oklahoma', fee: 100 },
  { stateCode: 'OR', stateName: 'Oregon', fee: 100 },
  { stateCode: 'PA', stateName: 'Pennsylvania', fee: 125 },
  { stateCode: 'RI', stateName: 'Rhode Island', fee: 150 },
  { stateCode: 'SC', stateName: 'South Carolina', fee: 110 },
  { stateCode: 'SD', stateName: 'South Dakota', fee: 150 },
  { stateCode: 'TN', stateName: 'Tennessee', fee: 300 },
  { stateCode: 'TX', stateName: 'Texas', fee: 300 },
  { stateCode: 'UT', stateName: 'Utah', fee: 59 },
  { stateCode: 'VT', stateName: 'Vermont', fee: 155 },
  { stateCode: 'VA', stateName: 'Virginia', fee: 100 },
  { stateCode: 'WA', stateName: 'Washington', fee: 200 },
  { stateCode: 'WV', stateName: 'West Virginia', fee: 100 },
  { stateCode: 'WI', stateName: 'Wisconsin', fee: 130 },
  { stateCode: 'WY', stateName: 'Wyoming', fee: 100 },
  { stateCode: 'DC', stateName: 'Washington D.C.', fee: 99 },
];

export const DEFAULT_STATE = 'WY';

/* -------------------------------------------------------------------------
   3. PACKAGES
   ------------------------------------------------------------------------- */
export type PackageOption = { id: string; name: string; price: number };

export const PACKAGES: PackageOption[] = [
  { id: 'standard', name: 'Standard', price: 120 },
  { id: 'advanced', name: 'Advanced', price: 170 },
];

export const DEFAULT_PACKAGE = 'standard';

/** Description text of the package line. {ST} {STATE} {PACKAGE} are replaced. */
export const PACKAGE_LINE_LABEL = '{ST} {PACKAGE} company formation package plan';

/** Description text of the state filing fee line. */
export const FILING_FEE_LINE_LABEL = '{STATE} State Filing Fee';

/* -------------------------------------------------------------------------
   4. ADD-ONS  -  add or delete rows freely.
      price  : the RATE shown on the invoice
      bonus  : true  -> rate still shows, amount charged is $0 and the
                        description gets "(Bonus)" appended
   ------------------------------------------------------------------------- */
export type AddonOption = { id: string; name: string; price: number; bonus: boolean };

export const ADDONS: AddonOption[] = [
  { id: 'itin', name: 'ITIN Application', price: 150, bonus: false },
  { id: 'trading', name: 'Trading Address', price: 50, bonus: false },
  { id: 'annual', name: 'Annual Report Filing', price: 60, bonus: false },

];

/** Add-ons ticked by default when the form loads. Use ids from ADDONS above. */
export const DEFAULT_ADDONS: string[] = [];

/* -------------------------------------------------------------------------
   5. ORDER TYPE  -  drives the invoice-number prefix
   ------------------------------------------------------------------------- */
export type OrderTypeOption = { id: string; label: string; prefix: string };

export const ORDER_TYPES: OrderTypeOption[] = [
  { id: 'llc', label: 'LLC / Company Formation', prefix: 'LLC' },
  { id: 'itin', label: 'ITIN', prefix: 'ITIN' },
  { id: 'renewal', label: 'Renewal', prefix: 'REN' },
];

export const DEFAULT_ORDER_TYPE = 'llc';

/* -------------------------------------------------------------------------
   6. SERVICE TYPES  (fixed dropdown).  {ST} = state code, {STATE} = full name
   ------------------------------------------------------------------------- */
export const SERVICE_TYPES: string[] = [
  '{ST}- Company Formation',
  '{ST}- ITIN Application',
  '{ST}- Annual Compliance',
  '{ST}- Annual Report Filing',
  '{ST}- Tax Filing',
  '{ST}- Company Dissolution',
];

export const DEFAULT_SERVICE_TYPE = '{ST}- Company Formation';

/* -------------------------------------------------------------------------
   7. INVOICE BY
   ------------------------------------------------------------------------- */
export const INVOICE_BY: string[] = [
  'Syed Abdullah Bukhari',
  'Hammad Tariq',
];

/* -------------------------------------------------------------------------
   8. PAYMENT STATUS  -  text printed in the box, top-right
   ------------------------------------------------------------------------- */
export type PaymentStatusOption = { id: string; label: string };

export const PAYMENT_STATUSES: PaymentStatusOption[] = [
  { id: 'unpaid', label: 'UNPAID' },
  { id: 'partial', label: 'PARTIAL PAID' },
  { id: 'paid', label: 'PAID' },
];

/* -------------------------------------------------------------------------
   9. PAYMENT TERMS  -  pre-filled into the form, still editable there.
      Tokens: {STATE} {ST} {TOTAL} {ADVANCE} {REMAINING} {PACKAGE} {FILING_FEE}
      ADVANCE = state filing fee + ADVANCE_EXTRA (below), capped at the total.
   ------------------------------------------------------------------------- */
export const ADVANCE_EXTRA = 50;

export const PAYMENT_TERMS: Record<string, { title: string; body: string }> = {
  llc: {
    title: 'Payment Terms for {STATE} LLC Formation',
    body:
      'An advance payment of ${ADVANCE} is required to cover the LLC State Filing Fee, Registered Agent Fee, and Address Cost. ' +
      'The remaining ${REMAINING} will be due after the EIN is obtained',
  },
  itin: {
    title: 'Payment Terms for {STATE} ITIN Application',
    body:
      'An advance payment of ${ADVANCE} is required before the ITIN application is prepared and couriered to the IRS. ' +
      'The remaining ${REMAINING} will be due once the ITIN is issued',
  },
  renewal: {
    title: 'Payment Terms for {STATE} LLC Renewal',
    body:
      'The annual renewal covers the Registered Agent, U.S. Business Address and the ' +
      '{STATE} State Annual Report fee of {RENEWAL_FEE}. {RENEWAL_DUE_SHORT}',
  },
  acc: {
    title: 'Payment Terms for {STATE} Accounting Services',
    body:
      'An advance payment of ${ADVANCE} is required to begin the engagement. ' +
      'The remaining ${REMAINING} will be due on delivery of the completed filing',
  },
};

/* -------------------------------------------------------------------------
   9b. ITIN PAYMENT TERMS  -  a SECOND terms block, printed directly under the
       main one, but only when the ITIN add-on below is ticked. Editable in the
       form just like the main terms.

       ADVANCE  = ITIN_ADVANCE, capped at the ITIN add-on price
       REMAINING = ITIN add-on price - ADVANCE
       So at the current $150 ITIN price this reads "$100 ... $50".
   ------------------------------------------------------------------------- */

/** Which add-on turns this block on. Must match an id in ADDONS. */
export const ITIN_ADDON_ID = 'itin';

/** Up-front portion of the ITIN fee. */
export const ITIN_ADVANCE = 100;

export const ITIN_TERMS = {
  title: 'Payment Terms for ITIN Application',
  body:
    'An advance payment of ${ADVANCE} is required to cover the ITIN Initial Cost. ' +
    'The remaining ${REMAINING} will be due after the ITIN is obtained',
};

/* -------------------------------------------------------------------------
   10. BANK DETAILS  -  add / remove lines freely
   ------------------------------------------------------------------------- */
export const BANK_BLOCKS: { title: string; lines: string[] }[] = [
  {
    title: 'PKR Bank',
    lines: [
      'Acc Name: ForeMint',
      'Bank Name: United Bank Limited (UBL)',
      'Acc No: 2369385556044',
      'IBAN: PK03UNIL0109000385556044',
    ],
  },
  {
    title: 'USD Bank (Wire Only)',
    lines: [
      'Company Name: ForeMint Solutions LLC',
      'Account Number: 16704799',
      'IBAN: GB33CLRB04281216704799',
      'SWIFT/BIC: CLRBGB22XXX',
      'Sort Code: 042812',
      'Bank: Clear Bank',
      'Bank Address: 133 Houndsditch, LONDON, EC3A 7BX',
    ],
  },
];

/* -------------------------------------------------------------------------
   11. FIXED WORDING
   ------------------------------------------------------------------------- */
export const HEADLINE = 'Hi! This is your Invoice.';
export const HEADLINE_ACCENT = 'Hi!';            // the purple part
export const THANK_YOU = 'Thank you for your Business!';
export const THANK_YOU_ACCENT = 'Business!';      // the purple part
export const PAGE1_FOOTER = 'Note: Please Share payment receipt with us on WhatAapp or Email';
export const PAGE2_FOOTER = 'If you need assistance with your annual compliance, ForeMint can handle the entire process on your behalf.';

/** Note printed beside the Discount row in the totals panel. {REASON} = your text. */
export const DISCOUNT_NOTE_LABEL = 'Discount applied - {REASON}';
export const DISCOUNT_NOTE_FALLBACK = 'as agreed';

/* -------------------------------------------------------------------------
   12. PAGE 2  -  ANNUAL COMPLIANCE
      Edit this text however you like. {STATE} is replaced with the selected
      state's full name, {ST} with its code. Set INCLUDE_COMPLIANCE_PAGE to
      false to generate a one-page invoice instead.

      Block kinds:  heading = purple bold | para = body text
                    check   = green tick + text | bullet = bulleted text
                    gap     = vertical space (size in points)
   ------------------------------------------------------------------------- */
export const INCLUDE_COMPLIANCE_PAGE = true;

export const COMPLIANCE_TITLE = '{STATE} Annual Compliance';
/** The leading words printed in purple; the rest of the title is dark. */
export const COMPLIANCE_TITLE_ACCENT = '{STATE}';

export type ComplianceBlock =
  | { kind: 'heading'; text: string }
  | { kind: 'para'; text: string }
  | { kind: 'check'; text: string }
  | { kind: 'bullet'; text: string }
  | { kind: 'gap'; size: number };

/*
   {RENEWAL_FEE} and {RENEWAL_DUE} are filled per invoice from the selected
   state's row in src/lib/onboarding/getStateFees.ts — the single source of
   truth for state fees. Wyoming prints "$60" and an anniversary-month rule;
   Texas prints "$0" and "Due May 15 every year". Both come from that file, so
   changing a fee there changes every invoice.
*/
export const COMPLIANCE_BLOCKS: ComplianceBlock[] = [
  { kind: 'para', text: "To keep your {STATE} LLC active and compliant each year, you need to complete the following annual requirements:" },
  { kind: 'gap', size: 17 },
  { kind: 'heading', text: 'Annual Compliance Costs:' },
  { kind: 'gap', size: 17 },
  { kind: 'check', text: 'Registered Agent (1 Year): $35' },
  { kind: 'check', text: 'U.S. Business Address (1 Year): $50' },
  { kind: 'check', text: '{STATE} State Annual Report: {RENEWAL_FEE}' },
  { kind: 'gap', size: 17 },
  { kind: 'para', text: '{RENEWAL_DUE}' },
  { kind: 'gap', size: 34 },
  { kind: 'heading', text: 'IRS Tax Filing Fees' },
  { kind: 'gap', size: 17 },
  { kind: 'check', text: 'Single Member LLC (Service-Based) – $100' },
  { kind: 'check', text: 'Single Member LLC (E-commerce) – $150 – $250' },
  { kind: 'check', text: 'Multi-Member LLC (2 Members) – $250 – $550' },
  { kind: 'check', text: 'C-Corporation – $300' },
  { kind: 'gap', size: 17 },
  { kind: 'para', text: 'Filings time starts from 15 Jan & Generally due by April 15 each year for most Single-Member LLCs.' },
  { kind: 'gap', size: 17 },
  { kind: 'heading', text: 'Important:' },
  { kind: 'gap', size: 17 },
  { kind: 'para', text: 'These annual requirements help keep your LLC in good standing with the State of {STATE} and the IRS. Missing deadlines may result in penalties, late fees, or your company becoming non-compliant.' },
];
