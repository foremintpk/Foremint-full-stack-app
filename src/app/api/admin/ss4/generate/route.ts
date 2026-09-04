/**
 * @file src/app/api/admin/ss4/generate/route.ts
 * @description Generates one SS-4 packet.
 *
 * One order per request, deliberately: a 20-order book would otherwise exceed
 * the serverless function timeout, and per-order requests are what let the UI
 * drive a real progress bar and report failures as they happen rather than
 * losing the whole run to one unreadable filing.
 */

import { NextResponse } from 'next/server';
import { getEinPendingOrder } from '@/lib/services/ss4/orders';
import { generateForOrder } from '@/lib/services/ss4/ss4-extraction.service';
import { requireSs4Admin, Ss4ForbiddenError } from '@/lib/services/ss4/guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** A vision read of a scanned filing routinely takes 60–120s. */
export const maxDuration = 300;

interface GenerateBody {
  orderNumber?: string;
  /** Groups the orders of one run so the records table can show them together. */
  batchId?: string;
  instructions?: string;
  /** Exact name for line 7a. Wins over the order form and the ID read. */
  nameOverride?: string;
}

export async function POST(request: Request) {
  let admin;
  try {
    admin = await requireSs4Admin();
  } catch (error) {
    if (error instanceof Ss4ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }

  let body: GenerateBody;
  try {
    body = (await request.json()) as GenerateBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const orderNumber = body.orderNumber?.trim();
  if (!orderNumber) {
    return NextResponse.json({ error: 'orderNumber is required' }, { status: 400 });
  }

  const order = await getEinPendingOrder(orderNumber);
  if (!order) {
    return NextResponse.json(
      { error: `${orderNumber} is not in the EIN-pending book.` },
      { status: 404 }
    );
  }

  // generateForOrder never throws: a failure comes back as a `failed` result
  // that has already been recorded, so the batch can carry on to the next order.
  const result = await generateForOrder({
    order,
    instructions: body.instructions,
    nameOverride: body.nameOverride,
    batchId: body.batchId ?? crypto.randomUUID(),
    trigger: 'manual',
    adminId: admin.id,
  });

  return NextResponse.json(result, {
    // A failed order is a reported outcome, not a transport error — the client
    // renders it in the results table either way.
    status: 200,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
