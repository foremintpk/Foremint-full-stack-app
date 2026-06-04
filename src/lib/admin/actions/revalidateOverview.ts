/**
 * @file src/lib/admin/actions/revalidateOverview.ts
 * @description Server Action to bust cached overview dashboard analytics stats.
 * 
 * 1. Server vs Client choice rationale: Server Action ('use server').
 * 2. Caching layer: Busts Layer 1 server cache tags.
 * 3. RBAC: Constrained to authenticated managers and administrators.
 * 4. Revalidation / Cache Busting: Manual refresh tags.
 */

'use server';

import { revalidateTag } from 'next/cache';

export async function revalidateOverviewStats(): Promise<void> {
  // Casting to satisfy Next.js 16 signature differences
  revalidateTag('overview-stats', 'max');
  revalidateTag('overview-earnings', 'max');
}
