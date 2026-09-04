/**
 * @file src/app/api/admin/ss4/batches/route.ts
 * @description Generated packets grouped by the run that produced them, and
 * deletion of a whole run or a single packet.
 */

import { NextResponse } from 'next/server';
import { getSs4Records, getSs4Stats } from '@/lib/services/ss4/records';
import { deleteSs4Batch, deleteSs4Record, groupIntoBatches } from '@/lib/services/ss4/batches';
import { requireSs4Admin, Ss4ForbiddenError } from '@/lib/services/ss4/guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireSs4Admin();
    const [records, stats] = await Promise.all([getSs4Records({ limit: 500 }), getSs4Stats()]);
    return NextResponse.json(
      { batches: groupIntoBatches(records), stats },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    if (error instanceof Ss4ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : 'Could not read batches.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await requireSs4Admin();

    const params = new URL(request.url).searchParams;
    const batchId = params.get('batchId');
    const recordId = params.get('recordId');

    if (!batchId && !recordId) {
      return NextResponse.json({ error: 'Provide batchId or recordId.' }, { status: 400 });
    }
    if (batchId && recordId) {
      return NextResponse.json({ error: 'Provide only one of batchId or recordId.' }, { status: 400 });
    }

    const result = batchId ? await deleteSs4Batch(batchId) : await deleteSs4Record(recordId as string);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      deleted: result.deleted,
      // Rows are gone either way; a storage failure leaves an orphaned file,
      // which is worth surfacing rather than hiding.
      storageFailures: result.storageFailures,
      warning: result.storageFailures.length
        ? `${result.storageFailures.length} file(s) could not be removed from storage: ${result.storageFailures.join(', ')}.`
        : undefined,
    });
  } catch (error) {
    if (error instanceof Ss4ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : 'Delete failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
