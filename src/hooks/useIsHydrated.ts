'use client';

import { useSyncExternalStore } from 'react';

// Hydration state never changes after mount, so the store needs no real
// subscription — the server snapshot differs from the client one, which is
// exactly what useSyncExternalStore is designed to reconcile.
const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * False during SSR and the hydrating render, true afterwards.
 *
 * Use it to defer browser-only values (such as the viewer's IANA timezone)
 * until after hydration, so server and client markup match on the first pass
 * without triggering a setState-in-effect cascade.
 */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
