// src/lib/onboarding/getStateFees.ts
// Static config — all 50 US states + DC
// Source of truth for state fees displayed in Formation step
// If fees change, update ONLY this file

import type { StateFeeConfig } from '@/types/onboarding'

export const STATE_FEES: StateFeeConfig[] = [
  { stateCode: 'AL', stateName: 'Alabama',        fee: 208 },
  { stateCode: 'AK', stateName: 'Alaska',         fee: 250 },
  { stateCode: 'AZ', stateName: 'Arizona',        fee: 85  },
  { stateCode: 'AR', stateName: 'Arkansas',       fee: 50  },
  { stateCode: 'CA', stateName: 'California',     fee: 70  },
  { stateCode: 'CO', stateName: 'Colorado',       fee: 50  },
  { stateCode: 'CT', stateName: 'Connecticut',    fee: 120 },
  { stateCode: 'DE', stateName: 'Delaware',       fee: 110 },
  { stateCode: 'FL', stateName: 'Florida',        fee: 138 },
  { stateCode: 'GA', stateName: 'Georgia',        fee: 100 },
  { stateCode: 'HI', stateName: 'Hawaii',         fee: 50  },
  { stateCode: 'ID', stateName: 'Idaho',          fee: 100 },
  { stateCode: 'IL', stateName: 'Illinois',       fee: 154 },
  { stateCode: 'IN', stateName: 'Indiana',        fee: 97  },
  { stateCode: 'IA', stateName: 'Iowa',           fee: 50  },
  { stateCode: 'KS', stateName: 'Kansas',         fee: 166 },
  { stateCode: 'KY', stateName: 'Kentucky',       fee: 40  },
  { stateCode: 'LA', stateName: 'Louisiana',      fee: 105 },
  { stateCode: 'ME', stateName: 'Maine',          fee: 175 },
  { stateCode: 'MD', stateName: 'Maryland',       fee: 155 },
  { stateCode: 'MA', stateName: 'Massachusetts',  fee: 500 },
  { stateCode: 'MI', stateName: 'Michigan',       fee: 50  },
  { stateCode: 'MN', stateName: 'Minnesota',      fee: 155 },
  { stateCode: 'MS', stateName: 'Mississippi',    fee: 53  },
  { stateCode: 'MO', stateName: 'Missouri',       fee: 52  },
  { stateCode: 'MT', stateName: 'Montana',        fee: 35  },
  { stateCode: 'NE', stateName: 'Nebraska',       fee: 110 },
  { stateCode: 'NV', stateName: 'Nevada',         fee: 425 },
  { stateCode: 'NH', stateName: 'New Hampshire',  fee: 100 },
  { stateCode: 'NJ', stateName: 'New Jersey',     fee: 125 },
  { stateCode: 'NM', stateName: 'New Mexico',     fee: 50  },
  { stateCode: 'NY', stateName: 'New York',       fee: 200 },
  { stateCode: 'NC', stateName: 'North Carolina', fee: 128 },
  { stateCode: 'ND', stateName: 'North Dakota',   fee: 135 },
  { stateCode: 'OH', stateName: 'Ohio',           fee: 99  },
  { stateCode: 'OK', stateName: 'Oklahoma',       fee: 104 },
  { stateCode: 'OR', stateName: 'Oregon',         fee: 100 },
  { stateCode: 'PA', stateName: 'Pennsylvania',   fee: 125 },
  { stateCode: 'RI', stateName: 'Rhode Island',   fee: 156 },
  { stateCode: 'SC', stateName: 'South Carolina', fee: 110 },
  { stateCode: 'SD', stateName: 'South Dakota',   fee: 150 },
  { stateCode: 'TN', stateName: 'Tennessee',      fee: 310 },
  { stateCode: 'TX', stateName: 'Texas',          fee: 308 },
  { stateCode: 'UT', stateName: 'Utah',           fee: 76  },
  { stateCode: 'VT', stateName: 'Vermont',        fee: 125 },
  { stateCode: 'VA', stateName: 'Virginia',       fee: 100 },
  { stateCode: 'WA', stateName: 'Washington',     fee: 200 },
  { stateCode: 'WV', stateName: 'West Virginia',  fee: 130 },
  { stateCode: 'WI', stateName: 'Wisconsin',      fee: 130 },
  { stateCode: 'WY', stateName: 'Wyoming',        fee: 100 },
  { stateCode: 'DC', stateName: 'Washington D.C.',fee: 220 },
]

export function getStateFee(stateCode: string): StateFeeConfig | undefined {
  return STATE_FEES.find(s => s.stateCode === stateCode)
}
