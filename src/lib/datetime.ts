/**
 * Shared date/time helpers for browser-timezone-aware input and display.
 *
 * Architecture (do not deviate):
 *   Storage   → UTC / absolute timestamptz in Postgres
 *   Transport → ISO 8601 string with offset
 *   Display   → formatted in the *browser's* IANA timezone
 *
 * A `datetime-local` input carries no timezone ("2026-08-23T20:00"), so it must
 * be explicitly interpreted against a timezone before it means an instant.
 * Conversion here uses Intl (full IANA tz database, DST-correct) rather than a
 * fixed offset — never subtract a hardcoded number of hours.
 */

/** The browser's IANA timezone, e.g. "Asia/Karachi". Falls back to UTC on the server. */
export function getBrowserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Offset in minutes between `timeZone` and UTC at the given instant.
 * Positive means the zone is ahead of UTC (Asia/Karachi → +300).
 *
 * Works by formatting the instant as wall-clock parts in the target zone and
 * comparing against the same instant read as UTC. Because it samples at a
 * specific instant, it is inherently DST-correct.
 */
function tzOffsetMinutes(instant: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  const parts: Record<string, number> = {};
  for (const p of dtf.formatToParts(instant)) {
    if (p.type !== 'literal') parts[p.type] = Number(p.value);
  }

  // Intl renders midnight as hour 24 in some engines; normalize to 0.
  const hour = parts.hour === 24 ? 0 : parts.hour;

  const asUtc = Date.UTC(
    parts.year, parts.month - 1, parts.day,
    hour, parts.minute, parts.second,
  );

  // Zero out sub-second noise so the difference lands on whole minutes.
  return (asUtc - Math.floor(instant.getTime() / 1000) * 1000) / 60000;
}

/**
 * Interpret a `datetime-local` value ("2026-08-23T20:00") as wall-clock time in
 * `timeZone` and return the absolute UTC instant as an ISO string.
 *
 * Example: "2026-08-23T20:00" in Asia/Karachi → "2026-08-23T15:00:00.000Z".
 *
 * Returns null for empty or unparseable input.
 */
export function localInputToIso(value: string | null | undefined, timeZone: string): string | null {
  if (!value || !value.trim()) return null;

  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(value.trim());
  if (!m) return null;

  const [, y, mo, d, h, mi, s] = m;
  // Treat the wall-clock reading as if it were UTC, then correct by the zone's
  // offset at (approximately) that instant. Two passes settle DST boundaries,
  // where the offset before and after the shift differ.
  const naive = Date.UTC(+y, +mo - 1, +d, +h, +mi, s ? +s : 0);
  if (Number.isNaN(naive)) return null;

  let instant = naive - tzOffsetMinutes(new Date(naive), timeZone) * 60000;
  instant = naive - tzOffsetMinutes(new Date(instant), timeZone) * 60000;

  const out = new Date(instant);
  return Number.isNaN(out.getTime()) ? null : out.toISOString();
}

/**
 * Inverse of `localInputToIso`: render an absolute timestamp as the
 * `datetime-local` wall-clock string for `timeZone`, for prefilling the input.
 */
export function isoToLocalInput(iso: string | null | undefined, timeZone: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });

  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(date)) {
    if (p.type !== 'literal') parts[p.type] = p.value;
  }
  const hour = parts.hour === '24' ? '00' : parts.hour;
  return `${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}`;
}

/** Format an absolute timestamp for display in `timeZone`. Empty string when absent/invalid. */
export function formatInTimeZone(
  iso: string | null | undefined,
  timeZone: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  try {
    return new Intl.DateTimeFormat(undefined, { ...options, timeZone }).format(date);
  } catch {
    return '';
  }
}

/** True when `iso` parses to a real instant strictly in the future relative to `reference`. */
export function isFuture(iso: string | null | undefined, reference: Date = new Date()): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return !Number.isNaN(t) && t > reference.getTime();
}
