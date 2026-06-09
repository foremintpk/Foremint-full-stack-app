'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const REFRESH_INTERVAL_MS = 30_000;

/**
 * Calls router.refresh() every 30 seconds to pull fresh server data
 * for all dashboard pages. Safe to call from multiple components —
 * the interval is registered once per component mount.
 */
export function useDashboardRefresh(enabled = true): void {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    timerRef.current = setInterval(() => {
      router.refresh();
    }, REFRESH_INTERVAL_MS);

    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled, router]);
}
