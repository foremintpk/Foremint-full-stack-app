/**
 * @file src/lib/onboarding/resolveRenewalDate.ts
 * @description Turns a state's published renewal rule into a real date for one
 * company, using its formation date.
 *
 * The `renewalDue` strings in getStateFees.ts come in two shapes, because the
 * states themselves work two different ways:
 *
 *   Fixed calendar date  "Apr 15", "Jun 1", "Mar 31"
 *     Every LLC in that state renews on the same day. The only per-company
 *     input is which year the first one falls in.
 *
 *   Anniversary-based    "Anniversary month", "Anniversary date",
 *                        "1st day of anniversary month", "Anniversary quarter"
 *     The date derives from when the company was formed, so it differs per LLC.
 *
 * Biennial states renew every two years, so the first renewal is two years out
 * rather than one. States with cycle 'None' have no renewal date at all.
 *
 * This is deliberately deterministic arithmetic rather than a model call: the
 * output drives billing and compliance reminders, and it has to be reproducible
 * and auditable.
 */

import { getStateFee } from './getStateFees'

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
}

export interface ResolvedRenewal {
  /** ISO yyyy-mm-dd, or null when the state requires no renewal. */
  date: string | null
  /** Recurring fee in USD; 0 where the state charges nothing. */
  fee: number
  cycle: 'Annual' | 'Biennial' | 'None'
  /** The rule this came from, kept so a value can be explained in the UI. */
  rule: string
  /** How the date was derived — useful when auditing a stored value. */
  basis: 'fixed-date' | 'anniversary' | 'none'
}

const iso = (y: number, m: number, d: number): string =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

/** Last day of a month, accounting for leap years. */
const lastDayOf = (year: number, month: number): number =>
  new Date(year, month + 1, 0).getDate()

/**
 * @param stateCode  two-letter state code, e.g. 'WY'
 * @param formationDate ISO yyyy-mm-dd from the filed Articles
 * @returns the first renewal falling due after formation, or null when the
 *          state has no renewal requirement or the inputs are unusable
 */
export function resolveRenewalDate(
  stateCode: string | null | undefined,
  formationDate: string | null | undefined
): ResolvedRenewal | null {
  if (!stateCode || !formationDate) return null

  const state = getStateFee(stateCode.toUpperCase())
  if (!state) return null

  const [fy, fm, fd] = formationDate.split('-').map(Number)
  if (!fy || !fm || !fd) return null
  const formedMonth = fm - 1 // JS months are 0-indexed

  if (state.renewalCycle === 'None') {
    return {
      date: null,
      fee: state.renewalFee,
      cycle: 'None',
      rule: state.renewalDue,
      basis: 'none',
    }
  }

  // Biennial states skip a year, so the first report is two years out.
  const step = state.renewalCycle === 'Biennial' ? 2 : 1
  const due = state.renewalDue

  // --- Anniversary-based ----------------------------------------------------
  if (/anniversary/i.test(due)) {
    const year = fy + step

    // "1st day of anniversary month" (WY) — the month the company was formed.
    if (/1st day of anniversary month/i.test(due)) {
      return { date: iso(year, formedMonth, 1), fee: state.renewalFee, cycle: state.renewalCycle, rule: due, basis: 'anniversary' }
    }

    // "Last day of anniversary month" (VA).
    if (/last day of anniversary month/i.test(due)) {
      return { date: iso(year, formedMonth, lastDayOf(year, formedMonth)), fee: state.renewalFee, cycle: state.renewalCycle, rule: due, basis: 'anniversary' }
    }

    // "Anniversary quarter" (HI, WI) — the last day of the quarter the company
    // was formed in, which is the deadline rather than the window's start.
    if (/anniversary quarter/i.test(due)) {
      const quarterEnd = Math.floor(formedMonth / 3) * 3 + 2
      return { date: iso(year, quarterEnd, lastDayOf(year, quarterEnd)), fee: state.renewalFee, cycle: state.renewalCycle, rule: due, basis: 'anniversary' }
    }

    // "Anniversary date" (LA, MA, OK, OR) — the exact day, clamped for a
    // formation date like Jan 31 landing in a shorter month.
    if (/anniversary date/i.test(due)) {
      const day = Math.min(fd, lastDayOf(year, formedMonth))
      return { date: iso(year, formedMonth, day), fee: state.renewalFee, cycle: state.renewalCycle, rule: due, basis: 'anniversary' }
    }

    // Bare "Anniversary month" (CO, ID, IL, IN, NJ, NV, NY, SD, UT, WA) — the
    // report is due by month end.
    return { date: iso(year, formedMonth, lastDayOf(year, formedMonth)), fee: state.renewalFee, cycle: state.renewalCycle, rule: due, basis: 'anniversary' }
  }

  // --- Fixed calendar date --------------------------------------------------
  // Matches the leading "Apr 15" / "Jun 1" / "Jan 2" of the rule string.
  const match = due.match(/^([A-Za-z]{3})[a-z]*\s+(\d{1,2})/)
  if (match) {
    const month = MONTHS[match[1].slice(0, 3).toLowerCase()]
    const day = Number(match[2])
    if (month !== undefined) {
      // The first renewal is the next occurrence strictly after formation.
      // A company formed on Jun 20 in a "Jun 1" state renews the FOLLOWING year.
      const thisYear = new Date(fy, month, day)
      const formed = new Date(fy, formedMonth, fd)
      const year = thisYear > formed ? fy + (step - 1) : fy + step
      return { date: iso(year, month, Math.min(day, lastDayOf(year, month))), fee: state.renewalFee, cycle: state.renewalCycle, rule: due, basis: 'fixed-date' }
    }
  }

  // A rule we cannot parse must not silently produce a wrong date.
  return { date: null, fee: state.renewalFee, cycle: state.renewalCycle, rule: due, basis: 'none' }
}
