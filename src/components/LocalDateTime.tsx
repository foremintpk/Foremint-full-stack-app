'use client';

import { formatInTimeZone, getBrowserTimeZone } from '@/lib/datetime';
import { useIsHydrated } from '@/hooks/useIsHydrated';

interface LocalDateTimeProps {
  /** Absolute ISO timestamp from the database (UTC). */
  value: string | null | undefined;
  options?: Intl.DateTimeFormatOptions;
  /** Rendered when `value` is absent or unparseable. */
  fallback?: string;
  className?: string;
}

/**
 * Render an absolute timestamp in the *browser's* timezone.
 *
 * The server has no access to the viewer's IANA zone, so formatting there would
 * either use the server's zone (wrong) or disagree with the client (hydration
 * mismatch). The server pass and the hydrating render both format in UTC so the
 * markup matches; once hydrated, the viewer's real zone takes over.
 */
export function LocalDateTime({ value, options, fallback = '—', className }: LocalDateTimeProps) {
  const hydrated = useIsHydrated();
  const timeZone = hydrated ? getBrowserTimeZone() : 'UTC';
  const text = formatInTimeZone(value, timeZone, options ?? { dateStyle: 'medium' });

  if (!value || !text) return <span className={className}>{fallback}</span>;
  return <span className={className}>{text}</span>;
}
