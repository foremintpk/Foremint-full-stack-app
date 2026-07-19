import { STATE_FEES } from './onboarding/getStateFees';

// Derived from STATE_FEES in src/lib/onboarding/getStateFees.ts — the single
// source of truth for state filing fees. Do not hardcode fees here.
export const US_STATES = STATE_FEES.map((s) => ({
  name: s.stateName,
  abbreviation: s.stateCode,
  filingFee: s.fee,
}));

export const BUSINESS_CATEGORIES = [
  'Technology & Software',
  'E-commerce & Retail',
  'Consulting & Professional Services',
  'Marketing & Advertising',
  'Finance & Accounting',
  'Real Estate',
  'Healthcare & Wellness',
  'Education & Training',
  'Media & Entertainment',
  'Food & Beverage',
  'Construction & Trades',
  'Import & Export',
  'Travel & Hospitality',
  'Legal Services',
  'Manufacturing',
  'Non-profit & Social Enterprise',
  'Other'
];
export const ADDONS = [
  {
    id: 'itin',
    title: 'ITIN Application',
    price: 150,
    priceLabel: '$150 one-time',
    icon: 'identification',
    bullets: [
      'Individual Taxpayer Identification Number',
      'Required for non-US members to open bank accounts',
      'We handle the full IRS application process',
      'Typical processing: 6–10 weeks',
    ],
  },
  {
    id: 'us_phone',
    title: 'US Phone Number',
    price: 10,
    priceLabel: '$10/month',
    icon: 'phone',
    bullets: [
      'US virtual phone number with your area code',
      'Forward calls to any international number',
      'Voicemail + SMS included',
      'Gives your business a local US presence',
    ],
  },
  {
    id: 'vps',
    title: 'VPS Hosting',
    price: 20,
    priceLabel: '$20/month',
    icon: 'server',
    bullets: [
      'Virtual Private Server hosted in the US',
      'Ideal for running business applications',
      '99.9% uptime SLA',
      'Managed setup assistance included',
    ],
  },
  {
    id: 'trading_address',
    title: 'US Trading Address',
    price: 25,
    priceLabel: '$25/month',
    icon: 'map-pin',
    bullets: [
      'Professional US business mailing address',
      'Mail scanning and forwarding',
      'Use on your website, invoices, and contracts',
      'Available in multiple US cities',
    ],
  },
  {
    id: 'wise_setup',
    title: 'Wise Business Account Setup',
    price: 80,
    priceLabel: '$80 one-time',
    icon: 'credit-card',
    bullets: [
      'We guide you through Wise account setup',
      'Multi-currency business account',
      'Accept USD, EUR, GBP and more',
      'Faster and cheaper international transfers',
    ],
  },
];

export const PACKAGES = {
  standard: { label: 'Standard Package', price: 120 },
  advanced: { label: 'Advanced Package', price: 170 },
} as const;
