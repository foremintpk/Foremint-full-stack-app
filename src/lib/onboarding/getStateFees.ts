// src/lib/onboarding/getStateFees.ts
// Static config — all 50 US states + DC
// SINGLE SOURCE OF TRUTH for LLC state filing fees across the app
// (US_STATES in src/lib/onboarding-data.ts derives from this list).
// If fees change, update ONLY this file — and mirror the values in
// mobile/lib/states.ts (separate Expo project, cannot import from here).

import type { StateFeeConfig } from '@/types/onboarding'

export const STATE_FEES: StateFeeConfig[] = [
  { stateCode: 'AL', stateName: 'Alabama',        fee: 200 },
  { stateCode: 'AK', stateName: 'Alaska',         fee: 250 },
  { stateCode: 'AZ', stateName: 'Arizona',        fee: 50  },
  { stateCode: 'AR', stateName: 'Arkansas',       fee: 45  },
  { stateCode: 'CA', stateName: 'California',     fee: 70  },
  { stateCode: 'CO', stateName: 'Colorado',       fee: 50  },
  { stateCode: 'CT', stateName: 'Connecticut',    fee: 120 },
  { stateCode: 'DE', stateName: 'Delaware',       fee: 110 },
  { stateCode: 'FL', stateName: 'Florida',        fee: 125 },
  { stateCode: 'GA', stateName: 'Georgia',        fee: 100 },
  { stateCode: 'HI', stateName: 'Hawaii',         fee: 50  },
  { stateCode: 'ID', stateName: 'Idaho',          fee: 100 },
  { stateCode: 'IL', stateName: 'Illinois',       fee: 150 },
  { stateCode: 'IN', stateName: 'Indiana',        fee: 95  },
  { stateCode: 'IA', stateName: 'Iowa',           fee: 50  },
  { stateCode: 'KS', stateName: 'Kansas',         fee: 160 },
  { stateCode: 'KY', stateName: 'Kentucky',       fee: 40  },
  { stateCode: 'LA', stateName: 'Louisiana',      fee: 100 },
  { stateCode: 'ME', stateName: 'Maine',          fee: 175 },
  { stateCode: 'MD', stateName: 'Maryland',       fee: 100 },
  { stateCode: 'MA', stateName: 'Massachusetts',  fee: 500 },
  { stateCode: 'MI', stateName: 'Michigan',       fee: 50  },
  { stateCode: 'MN', stateName: 'Minnesota',      fee: 155 },
  { stateCode: 'MS', stateName: 'Mississippi',    fee: 50  },
  { stateCode: 'MO', stateName: 'Missouri',       fee: 50  },
  { stateCode: 'MT', stateName: 'Montana',        fee: 35  },
  { stateCode: 'NE', stateName: 'Nebraska',       fee: 100 },
  { stateCode: 'NV', stateName: 'Nevada',         fee: 425 },
  { stateCode: 'NH', stateName: 'New Hampshire',  fee: 100 },
  { stateCode: 'NJ', stateName: 'New Jersey',     fee: 125 },
  { stateCode: 'NM', stateName: 'New Mexico',     fee: 50  },
  { stateCode: 'NY', stateName: 'New York',       fee: 200 },
  { stateCode: 'NC', stateName: 'North Carolina', fee: 125 },
  { stateCode: 'ND', stateName: 'North Dakota',   fee: 135 },
  { stateCode: 'OH', stateName: 'Ohio',           fee: 99  },
  { stateCode: 'OK', stateName: 'Oklahoma',       fee: 100 },
  { stateCode: 'OR', stateName: 'Oregon',         fee: 100 },
  { stateCode: 'PA', stateName: 'Pennsylvania',   fee: 125 },
  { stateCode: 'RI', stateName: 'Rhode Island',   fee: 150 },
  { stateCode: 'SC', stateName: 'South Carolina', fee: 110 },
  { stateCode: 'SD', stateName: 'South Dakota',   fee: 150 },
  { stateCode: 'TN', stateName: 'Tennessee',      fee: 300 },
  { stateCode: 'TX', stateName: 'Texas',          fee: 300 },
  { stateCode: 'UT', stateName: 'Utah',           fee: 59  },
  { stateCode: 'VT', stateName: 'Vermont',        fee: 155 },
  { stateCode: 'VA', stateName: 'Virginia',       fee: 100 },
  { stateCode: 'WA', stateName: 'Washington',     fee: 200 },
  { stateCode: 'WV', stateName: 'West Virginia',  fee: 100 },
  { stateCode: 'WI', stateName: 'Wisconsin',      fee: 130 },
  { stateCode: 'WY', stateName: 'Wyoming',        fee: 100 },
  { stateCode: 'DC', stateName: 'Washington D.C.',fee: 99  },
]

export function getStateFee(stateCode: string): StateFeeConfig | undefined {
  return STATE_FEES.find(s => s.stateCode === stateCode)
}
