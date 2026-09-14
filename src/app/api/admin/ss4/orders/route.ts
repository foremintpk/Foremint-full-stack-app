/**
 * @file src/app/api/admin/ss4/orders/route.ts
 * @description Lists the EIN-pending order book for the manual-selection table.
 *
 * Pure SQL on both sides — no model calls, so refreshing the list costs nothing.
 */

import { NextResponse } from 'next/server';
import { getEinPendingOrders } from '@/lib/services/ss4/orders';
import { visionStatus } from '@/lib/services/ss4/vision';
import { requireSs4Admin, Ss4ForbiddenError } from '@/lib/services/ss4/guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireSs4Admin();

    const [rows, vision] = await Promise.all([getEinPendingOrders(), visionStatus()]);

    return NextResponse.json(
      {
        rows,
        fetchedAt: new Date().toISOString(),
        // Surfaced so the page can warn up front rather than failing per order:
        // scanned Articles and the ID name check both need a vision provider.
        vision,
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    if (error instanceof Ss4ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : 'Failed to read orders';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
