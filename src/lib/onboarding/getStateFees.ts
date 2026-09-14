// src/lib/onboarding/getStateFees.ts
// Static config — all 50 US states + DC
// SINGLE SOURCE OF TRUTH for LLC state fees across the app:
//   fee          one-time state filing fee (USD)
//   renewalFee   recurring annual/biennial report or franchise fee (USD)
//   renewalCycle 'Annual' | 'Biennial' | 'None'
//   renewalDue   due date as the state publishes it — a fixed date ("Apr 15")
//                or an anniversary rule ("Anniversary month")
//
// (US_STATES in src/lib/onboarding-data.ts derives from this list.)
// Fee and renewal data compiled from public Secretary of State fee schedules.
// If anything changes, update ONLY this file — and mirror the values in
// mobile/lib/states.ts (separate Expo project, cannot import from here).
//
// Anniversary-based states have no fixed calendar date; resolveRenewalDate()
// in ./resolveRenewalDate.ts turns renewalDue into a real date for one company
// using its formation date.

import type { StateFeeConfig } from '@/types/onboarding'

export const STATE_FEES: StateFeeConfig[] = [
  { stateCode: 'AL', stateName: 'Alabama',         fee: 200,  renewalFee: 50,      renewalCycle: 'Annual',    renewalDue: 'Apr 15 (Business Privilege Tax)' },
  { stateCode: 'AK', stateName: 'Alaska',          fee: 250,  renewalFee: 100,     renewalCycle: 'Biennial',  renewalDue: 'Jan 2, every 2 years' },
  { stateCode: 'AZ', stateName: 'Arizona',         fee: 50,   renewalFee: 0,       renewalCycle: 'None',      renewalDue: 'No annual report' },
  { stateCode: 'AR', stateName: 'Arkansas',        fee: 45,   renewalFee: 150,     renewalCycle: 'Annual',    renewalDue: 'May 1 (franchise tax)' },
  { stateCode: 'CA', stateName: 'California',      fee: 70,   renewalFee: 800,     renewalCycle: 'Annual',    renewalDue: 'Apr 15 ($800 min franchise tax)' },
  { stateCode: 'CO', stateName: 'Colorado',        fee: 50,   renewalFee: 25,      renewalCycle: 'Annual',    renewalDue: 'Anniversary month' },
  { stateCode: 'CT', stateName: 'Connecticut',     fee: 120,  renewalFee: 80,      renewalCycle: 'Annual',    renewalDue: 'Mar 31' },
  { stateCode: 'DE', stateName: 'Delaware',        fee: 110,  renewalFee: 300,     renewalCycle: 'Annual',    renewalDue: 'Jun 1 ($300 franchise tax)' },
  { stateCode: 'FL', stateName: 'Florida',         fee: 125,  renewalFee: 138.75,  renewalCycle: 'Annual',    renewalDue: 'May 1' },
  { stateCode: 'GA', stateName: 'Georgia',         fee: 100,  renewalFee: 50,      renewalCycle: 'Annual',    renewalDue: 'Apr 1' },
  { stateCode: 'HI', stateName: 'Hawaii',          fee: 50,   renewalFee: 15,      renewalCycle: 'Annual',    renewalDue: 'Anniversary quarter' },
  { stateCode: 'ID', stateName: 'Idaho',           fee: 100,  renewalFee: 0,       renewalCycle: 'Annual',    renewalDue: 'Anniversary month ($0 report)' },
  { stateCode: 'IL', stateName: 'Illinois',        fee: 150,  renewalFee: 75,      renewalCycle: 'Annual',    renewalDue: 'Anniversary month' },
  { stateCode: 'IN', stateName: 'Indiana',         fee: 95,   renewalFee: 32,      renewalCycle: 'Biennial',  renewalDue: 'Anniversary month, every 2 years' },
  { stateCode: 'IA', stateName: 'Iowa',            fee: 50,   renewalFee: 30,      renewalCycle: 'Biennial',  renewalDue: 'Apr 1, odd years' },
  { stateCode: 'KS', stateName: 'Kansas',          fee: 160,  renewalFee: 50,      renewalCycle: 'Annual',    renewalDue: 'Apr 15' },
  { stateCode: 'KY', stateName: 'Kentucky',        fee: 40,   renewalFee: 15,      renewalCycle: 'Annual',    renewalDue: 'Jun 30' },
  { stateCode: 'LA', stateName: 'Louisiana',       fee: 100,  renewalFee: 35,      renewalCycle: 'Annual',    renewalDue: 'Anniversary date' },
  { stateCode: 'ME', stateName: 'Maine',           fee: 175,  renewalFee: 85,      renewalCycle: 'Annual',    renewalDue: 'Jun 1' },
  { stateCode: 'MD', stateName: 'Maryland',        fee: 100,  renewalFee: 300,     renewalCycle: 'Annual',    renewalDue: 'Apr 15' },
  { stateCode: 'MA', stateName: 'Massachusetts',   fee: 500,  renewalFee: 500,     renewalCycle: 'Annual',    renewalDue: 'Anniversary date' },
  { stateCode: 'MI', stateName: 'Michigan',        fee: 50,   renewalFee: 25,      renewalCycle: 'Annual',    renewalDue: 'Feb 15' },
  { stateCode: 'MN', stateName: 'Minnesota',       fee: 155,  renewalFee: 0,       renewalCycle: 'Annual',    renewalDue: 'Dec 31 ($0 report)' },
  { stateCode: 'MS', stateName: 'Mississippi',     fee: 50,   renewalFee: 0,       renewalCycle: 'Annual',    renewalDue: 'Apr 15 ($0 report)' },
  { stateCode: 'MO', stateName: 'Missouri',        fee: 50,   renewalFee: 0,       renewalCycle: 'None',      renewalDue: 'No annual report' },
  { stateCode: 'MT', stateName: 'Montana',         fee: 35,   renewalFee: 20,      renewalCycle: 'Annual',    renewalDue: 'Apr 15' },
  { stateCode: 'NE', stateName: 'Nebraska',        fee: 100,  renewalFee: 13,      renewalCycle: 'Biennial',  renewalDue: 'Apr 1, odd years' },
  { stateCode: 'NV', stateName: 'Nevada',          fee: 425,  renewalFee: 350,     renewalCycle: 'Annual',    renewalDue: 'Anniversary month (list + license)' },
  { stateCode: 'NH', stateName: 'New Hampshire',   fee: 100,  renewalFee: 100,     renewalCycle: 'Annual',    renewalDue: 'Apr 1' },
  { stateCode: 'NJ', stateName: 'New Jersey',      fee: 125,  renewalFee: 75,      renewalCycle: 'Annual',    renewalDue: 'Anniversary month' },
  { stateCode: 'NM', stateName: 'New Mexico',      fee: 50,   renewalFee: 0,       renewalCycle: 'None',      renewalDue: 'No annual report, ever' },
  { stateCode: 'NY', stateName: 'New York',        fee: 200,  renewalFee: 9,       renewalCycle: 'Biennial',  renewalDue: 'Anniversary month, every 2 years' },
  { stateCode: 'NC', stateName: 'North Carolina',  fee: 125,  renewalFee: 203,     renewalCycle: 'Annual',    renewalDue: 'Apr 15' },
  { stateCode: 'ND', stateName: 'North Dakota',    fee: 135,  renewalFee: 50,      renewalCycle: 'Annual',    renewalDue: 'Nov 15' },
  { stateCode: 'OH', stateName: 'Ohio',            fee: 99,   renewalFee: 0,       renewalCycle: 'None',      renewalDue: 'No annual report' },
  { stateCode: 'OK', stateName: 'Oklahoma',        fee: 100,  renewalFee: 25,      renewalCycle: 'Annual',    renewalDue: 'Anniversary date' },
  { stateCode: 'OR', stateName: 'Oregon',          fee: 100,  renewalFee: 100,     renewalCycle: 'Annual',    renewalDue: 'Anniversary date' },
  { stateCode: 'PA', stateName: 'Pennsylvania',    fee: 125,  renewalFee: 7,       renewalCycle: 'Annual',    renewalDue: 'Sep 30' },
  { stateCode: 'RI', stateName: 'Rhode Island',    fee: 150,  renewalFee: 50,      renewalCycle: 'Annual',    renewalDue: 'May 1' },
  { stateCode: 'SC', stateName: 'South Carolina',  fee: 110,  renewalFee: 0,       renewalCycle: 'None',      renewalDue: 'No annual report' },
  { stateCode: 'SD', stateName: 'South Dakota',    fee: 150,  renewalFee: 50,      renewalCycle: 'Annual',    renewalDue: 'Anniversary month' },
  { stateCode: 'TN', stateName: 'Tennessee',       fee: 300,  renewalFee: 300,     renewalCycle: 'Annual',    renewalDue: 'Apr 1 (min $300)' },
  { stateCode: 'TX', stateName: 'Texas',           fee: 300,  renewalFee: 0,       renewalCycle: 'Annual',    renewalDue: 'May 15 ($0 under $2.47M revenue)' },
  { stateCode: 'UT', stateName: 'Utah',            fee: 59,   renewalFee: 18,      renewalCycle: 'Annual',    renewalDue: 'Anniversary month' },
  { stateCode: 'VT', stateName: 'Vermont',         fee: 155,  renewalFee: 35,      renewalCycle: 'Annual',    renewalDue: 'Mar 31' },
  { stateCode: 'VA', stateName: 'Virginia',        fee: 100,  renewalFee: 50,      renewalCycle: 'Annual',    renewalDue: 'Last day of anniversary month' },
  { stateCode: 'WA', stateName: 'Washington',      fee: 200,  renewalFee: 70,      renewalCycle: 'Annual',    renewalDue: 'Anniversary month' },
  { stateCode: 'WV', stateName: 'West Virginia',   fee: 100,  renewalFee: 25,      renewalCycle: 'Annual',    renewalDue: 'Jul 1' },
  { stateCode: 'WI', stateName: 'Wisconsin',       fee: 130,  renewalFee: 25,      renewalCycle: 'Annual',    renewalDue: 'Anniversary quarter' },
  { stateCode: 'WY', stateName: 'Wyoming',         fee: 100,  renewalFee: 60,      renewalCycle: 'Annual',    renewalDue: '1st day of anniversary month' },
  { stateCode: 'DC', stateName: 'District of Columbia', fee: 99,   renewalFee: 300,     renewalCycle: 'Biennial',  renewalDue: 'Apr 1, every 2 years' },
]

export function getStateFee(stateCode: string): StateFeeConfig | undefined {
  return STATE_FEES.find(s => s.stateCode === stateCode)
}
