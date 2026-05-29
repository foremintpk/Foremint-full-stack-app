'use client';

import { CustomerNotification } from '@/types/dashboard';

const CACHE_KEY = 'fm_customer_notif_cache';
const BADGE_KEY = 'fm_customer_badge_count';
const STALE_AFTER_MS = 30_000; // 30 seconds

export interface CustomerNotifCache {
  fetchedAt: number;
  count: number;
  items: CustomerNotification[];
}

export function getCustomerNotifCache(): CustomerNotifCache | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CustomerNotifCache;
  } catch {
    return null;
  }
}

export function setCustomerNotifCache(data: CustomerNotifCache): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // fail silently
  }
}

export function isCustomerNotifCacheStale(): boolean {
  const cache = getCustomerNotifCache();
  if (!cache) return true;
  return Date.now() - cache.fetchedAt > STALE_AFTER_MS;
}

export function clearCustomerNotifCache(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(CACHE_KEY);
    sessionStorage.removeItem(BADGE_KEY);
  } catch {
    // ignore
  }
}

export function getCustomerSidebarCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem('fm_customer_sidebar_collapsed') === 'true';
  } catch {
    return false;
  }
}

export function setCustomerSidebarCollapsed(value: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('fm_customer_sidebar_collapsed', String(value));
  } catch {
    // ignore
  }
}

export function getCustomerSessionBadgeCount(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const count = sessionStorage.getItem(BADGE_KEY);
    return count !== null ? parseInt(count, 10) : null;
  } catch {
    return null;
  }
}

export function setCustomerSessionBadgeCount(count: number): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(BADGE_KEY, String(count));
  } catch {
    // ignore
  }
}
