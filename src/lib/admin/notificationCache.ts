/**
 * @file src/lib/admin/notificationCache.ts
 * @description Client-only sessionStorage and localStorage caching helpers for the Admin Dashboard.
 * 
 * CLIENT-ONLY — do not import in Server Components or API routes.
 * 
 * 1. Server vs Client choice rationale: Client-only state/storage manager.
 * 2. Caching layer: Layer 4 - Browser Storage (sessionStorage for notifications, localStorage for sidebar preferences).
 * 3. RBAC: N/A.
 * 4. Revalidation / Cache Busting: Handled via stale check triggers.
 */

'use client';

import { SafeAdminNotification } from '@/types/admin';

const CACHE_KEY = 'fm_admin_notif_cache';
const BADGE_KEY = 'fm_admin_badge_count';
const STALE_AFTER_MS = 30_000; // 30 seconds

export interface NotifCache {
  fetchedAt: number;
  count: number;
  items: SafeAdminNotification[];
}

export function getNotifCache(): NotifCache | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as NotifCache;
  } catch {
    return null;
  }
}

export function setNotifCache(data: NotifCache): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // sessionStorage quota exceeded or unavailable — fail silently
  }
}

export function isNotifCacheStale(): boolean {
  const cache = getNotifCache();
  if (!cache) return true;
  return Date.now() - cache.fetchedAt > STALE_AFTER_MS;
}

export function clearNotifCache(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(CACHE_KEY);
    sessionStorage.removeItem(BADGE_KEY);
  } catch {
    // ignore
  }
}

export function getSidebarCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem('fm_sidebar_collapsed') === 'true';
  } catch {
    return false;
  }
}

export function setSidebarCollapsed(value: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('fm_sidebar_collapsed', String(value));
  } catch {
    // ignore
  }
}
export function getSessionBadgeCount(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const count = sessionStorage.getItem(BADGE_KEY);
    return count !== null ? parseInt(count, 10) : null;
  } catch {
    return null;
  }
}

export function setSessionBadgeCount(count: number): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(BADGE_KEY, String(count));
  } catch {
    // ignore
  }
}
