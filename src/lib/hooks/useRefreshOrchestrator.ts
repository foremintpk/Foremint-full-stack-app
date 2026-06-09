'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Schedules a server-data reconciliation via router.refresh() at the given
 * interval (default 60 s).  Realtime subscriptions handle <1 s updates;
 * this is the fallback-only layer that catches anything the WS connection
 * missed (e.g. tab was backgrounded, channel reconnect gap).
 *
 * Drop-in replacement for useDashboardRefresh — call with no args to get the
 * default 60 s cadence, or pass { interval } to override.
 */
export function useRefreshOrchestrator(options?: { interval?: number; enabled?: boolean }): void {
  const router = useRouter();
  const interval = options?.interval ?? 60_000;
  const enabled  = options?.enabled  ?? true;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    timerRef.current = setInterval(() => {
      router.refresh();
    }, interval);

    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled, interval, router]);
}
