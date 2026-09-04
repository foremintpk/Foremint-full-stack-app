/**
 * @file src/app/api/admin/documents/coverage/route.ts
 * @description Per-order document coverage — which orders are missing which
 * documents. This is the view that answers "what still needs chasing".
 */

import { NextResponse } from 'next/server';
import { getCoverage, TRACKED_CATEGORIES } from '@/lib/services/documents/orderBook';
import { requireSs4Admin, Ss4ForbiddenError } from '@/lib/services/ss4/guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireSs4Admin();

    const rows = await getCoverage();

    // Counts per category, restricted to orders far enough along that the
    // document is actually expected — a pending order has no Articles yet, and
    // counting it as "missing" would drown the real gaps.
    const active = rows.filter((r) => r.status === 'formed' || r.status === 'ein_pending');
    const missing = TRACKED_CATEGORIES.reduce(
      (acc, cat) => {
        acc[cat] = active.filter((r) => !r.has[cat]).length;
        return acc;
      },
      {} as Record<string, number>
    );

    return NextResponse.json(
      {
        rows,
        stats: {
          totalOrders: rows.length,
          activeOrders: active.length,
          missing,
        },
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    if (error instanceof Ss4ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : 'Could not read coverage.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
