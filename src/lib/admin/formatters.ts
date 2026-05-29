/**
 * @file src/lib/admin/formatters.ts
 * @description Beautiful UI formatting utilities for currency, large numbers, and relative times.
 * 
 * 1. Server vs Client choice rationale: Pure functions.
 * 2. Caching layer: N/A.
 * 3. RBAC: N/A.
 * 4. Revalidation / Cache Busting: N/A.
 */

import { formatDistanceToNow } from 'date-fns';

/**
 * Formats a currency amount into Pakistani Rupee (PKR).
 * E.g., 1800000 -> "PKR 1,800,000"
 */
export function formatPKR(amount: number): string {
  const formatted = amount.toLocaleString('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return `PKR ${formatted}`;
}

/**
 * Compact number formatting for massive counts.
 * E.g., 1200000 -> "1.2M", 1500 -> "1.5K"
 */
export function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/**
 * Formats an ISO date string into relative time.
 * E.g., "5 minutes ago"
 */
export function timeAgo(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return 'recently';
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (err) {
    return 'recently';
  }
}

/**
 * Ensures LLC names end with "LLC" exactly once, case-insensitively.
 */
export function formatLlcName(rawName: string | null | undefined): string {
  if (!rawName) return 'Unnamed LLC';
  const trimmed = rawName.trim();
  if (/\bllc\b/i.test(trimmed)) return trimmed;
  return `${trimmed} LLC`;
}

/**
 * Formats an ISO string to short date.
 * E.g., "May 12, 2026"
 */
export function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

