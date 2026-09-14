/**
 * @file src/app/api/admin/ss4/records/route.ts
 * @description Generated-document records for the EIN table.
 */

import { NextResponse } from 'next/server';
import { getSs4Records, getSs4Stats } from '@/lib/services/ss4/records';
import { requireSs4Admin, Ss4ForbiddenError } from '@/lib/services/ss4/guard';
import type { Ss4Status } from '@/lib/services/ss4/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STATUSES: readonly string[] = ['pending', 'passed', 'failed'];

export async function GET(request: Request) {
  try {
    await requireSs4Admin();

    const params = new URL(request.url).searchParams;
    const rawStatus = params.get('status');
    const status: Ss4Status | 'all' =
      rawStatus && STATUSES.includes(rawStatus) ? (rawStatus as Ss4Status) : 'all';

    const [records, stats] = await Promise.all([
      getSs4Records({
        status,
        batchId: params.get('batchId') ?? undefined,
        q: params.get('q') ?? undefined,
      }),
      getSs4Stats(),
    ]);

    return NextResponse.json(
      { records, stats },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    if (error instanceof Ss4ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : 'Failed to read records';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
