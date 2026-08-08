// Country dial codes for the member WhatsApp number field.
// Sorted with the most common Foremint markets first, then alphabetically.

export interface DialCode {
  country: string
  code: string   // e.g. "+1"
  iso: string    // ISO 3166-1 alpha-2, used as a stable option key
}

// Note: option values must be unique — countries sharing a dial code
// (US/Canada +1) are merged into a single entry.
export const DIAL_CODES: DialCode[] = [
  { country: 'United States / Canada', code: '+1', iso: 'US' },
  { country: 'Pakistan',             code: '+92',  iso: 'PK' },
  { country: 'United Kingdom',       code: '+44',  iso: 'GB' },
  { country: 'United Arab Emirates', code: '+971', iso: 'AE' },
  { country: 'Australia',            code: '+61',  iso: 'AU' },
  { country: 'Austria',              code: '+43',  iso: 'AT' },
  { country: 'Bahrain',              code: '+973', iso: 'BH' },
  { country: 'Bangladesh',           code: '+880', iso: 'BD' },
  { country: 'Belgium',              code: '+32',  iso: 'BE' },
  { country: 'Brazil',               code: '+55',  iso: 'BR' },
  { country: 'China',                code: '+86',  iso: 'CN' },
  { country: 'Egypt',                code: '+20',  iso: 'EG' },
  { country: 'France',               code: '+33',  iso: 'FR' },
  { country: 'Germany',              code: '+49',  iso: 'DE' },
  { country: 'India',                code: '+91',  iso: 'IN' },
  { country: 'Indonesia',            code: '+62',  iso: 'ID' },
  { country: 'Ireland',              code: '+353', iso: 'IE' },
  { country: 'Italy',                code: '+39',  iso: 'IT' },
  { country: 'Japan',                code: '+81',  iso: 'JP' },
  { country: 'Jordan',               code: '+962', iso: 'JO' },
  { country: 'Kenya',                code: '+254', iso: 'KE' },
  { country: 'Kuwait',               code: '+965', iso: 'KW' },
  { country: 'Malaysia',             code: '+60',  iso: 'MY' },
  { country: 'Mexico',               code: '+52',  iso: 'MX' },
  { country: 'Morocco',              code: '+212', iso: 'MA' },
  { country: 'Nepal',                code: '+977', iso: 'NP' },
  { country: 'Netherlands',          code: '+31',  iso: 'NL' },
  { country: 'New Zealand',          code: '+64',  iso: 'NZ' },
  { country: 'Nigeria',              code: '+234', iso: 'NG' },
  { country: 'Norway',               code: '+47',  iso: 'NO' },
  { country: 'Oman',                 code: '+968', iso: 'OM' },
  { country: 'Philippines',          code: '+63',  iso: 'PH' },
  { country: 'Poland',               code: '+48',  iso: 'PL' },
  { country: 'Portugal',             code: '+351', iso: 'PT' },
  { country: 'Qatar',                code: '+974', iso: 'QA' },
  { country: 'Saudi Arabia',         code: '+966', iso: 'SA' },
  { country: 'Singapore',            code: '+65',  iso: 'SG' },
  { country: 'South Africa',         code: '+27',  iso: 'ZA' },
  { country: 'South Korea',          code: '+82',  iso: 'KR' },
  { country: 'Spain',                code: '+34',  iso: 'ES' },
  { country: 'Sri Lanka',            code: '+94',  iso: 'LK' },
  { country: 'Sweden',               code: '+46',  iso: 'SE' },
  { country: 'Switzerland',          code: '+41',  iso: 'CH' },
  { country: 'Thailand',             code: '+66',  iso: 'TH' },
  { country: 'Turkey',               code: '+90',  iso: 'TR' },
  { country: 'Ukraine',              code: '+380', iso: 'UA' },
  { country: 'Vietnam',              code: '+84',  iso: 'VN' },
]

/** Combine dial code + number into the display/persistence string, e.g. "+92 3001234567". */
export function formatMemberPhone(
  countryCode: string | null | undefined,
  number: string | null | undefined
): string | null {
  const code = (countryCode ?? '').trim()
  const num = (number ?? '').trim()
  if (!num) return null
  return code ? `${code} ${num}` : num
}
