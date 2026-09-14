'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useVisibleInterval } from './useVisibleInterval';

/**
 * Schedules a server-data reconciliation via router.refresh() at the given
 * interval (default 120 s).  Realtime subscriptions handle <1 s updates;
 * this is the fallback-only layer that catches anything the WS connection
 * missed (e.g. tab was backgrounded, channel reconnect gap).
 *
 * Why it still exists: router.refresh() re-runs Server Components, so it is the
 * only thing that reconciles server-rendered surfaces — the LLC grid, stats
 * cards and order tables. Realtime handlers update client state (badges,
 * toasts) and cannot refresh those, so removing this entirely would let them go
 * stale after a missed event.
 *
 * Why it is bounded: each refresh re-runs every Server Component on the page,
 * and the proxy resolves the caller's profile on those requests, so a shorter
 * cadence multiplied across open admin tabs was a significant share of the
 * application's steady-state database traffic. Running only while the tab is
 * visible removes that cost for backgrounded tabs completely, and 120 s halves
 * it for active ones while keeping the reconciliation guarantee.
 */
export function useRefreshOrchestrator(options?: { interval?: number; enabled?: boolean }): void {
  const router = useRouter();
  const interval = options?.interval ?? 120_000;
  const enabled  = options?.enabled  ?? true;

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  // runOnFocus: false — returning to a tab already triggers Next's own focus
  // revalidation, so refreshing again here would double the work on every
  // tab switch.
  useVisibleInterval(refresh, interval, { enabled, runOnFocus: false });
}
