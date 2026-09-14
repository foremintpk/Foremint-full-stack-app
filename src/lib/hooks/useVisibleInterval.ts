'use client';

import { useEffect, useRef } from 'react';

/**
 * @file src/lib/hooks/useVisibleInterval.ts
 * @description setInterval that only runs while the tab is visible.
 *
 * Background tabs were still polling on their normal cadence, so every admin
 * tab left open in another window kept issuing badge counts, notification
 * fetches and full-page reconciliations against a database nobody was looking
 * at. Gating on `document.visibilityState` stops that work entirely while
 * hidden and resumes it on focus.
 *
 * Catch-up behaviour: when a tab becomes visible again the callback fires once
 * immediately (unless `runOnFocus` is false) so the UI reflects anything that
 * changed while it was hidden — the same guarantee the plain interval gave,
 * without the requests nobody could see.
 */
export function useVisibleInterval(
  callback: () => void,
  intervalMs: number,
  options?: { enabled?: boolean; runOnFocus?: boolean }
): void {
  const enabled = options?.enabled ?? true;
  const runOnFocus = options?.runOnFocus ?? true;

  // Keep the latest callback without restarting the timer on every render.
  const savedCallback = useRef(callback);
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;
    if (typeof document === 'undefined') return;

    let timer: ReturnType<typeof setInterval> | null = null;

    const stop = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };

    const start = () => {
      if (timer !== null) return;
      timer = setInterval(() => savedCallback.current(), intervalMs);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Reconcile immediately, then resume the regular cadence.
        if (runOnFocus) savedCallback.current();
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stop();
    };
  }, [enabled, intervalMs, runOnFocus]);
}
