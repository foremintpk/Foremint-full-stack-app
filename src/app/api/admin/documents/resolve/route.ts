/**
 * @file src/app/api/admin/documents/resolve/route.ts
 * @description Plans a bulk upload: given a list of filenames, works out the
 * category and target order for each. Nothing is uploaded here.
 *
 * Deliberately separate from the upload step so the operator sees exactly what
 * would happen before any file is stored. A document filed against the wrong
 * LLC puts one client's formation papers in another client's record, so the
 * review stage is not optional.
 */

import { NextResponse } from 'next/server';
import { getOrderBook, getExistingSlots } from '@/lib/services/documents/orderBook';
import { matchByFileName, CATEGORY_LABELS } from '@/lib/services/documents/matcher';
import { requireSs4Admin, Ss4ForbiddenError } from '@/lib/services/ss4/guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Guards against a runaway request; the UI uploads in batches anyway. */
const MAX_FILES = 200;

interface ResolveBody {
  files?: { name: string; size?: number }[];
}

export async function POST(request: Request) {
  try {
    await requireSs4Admin();
  } catch (error) {
    if (error instanceof Ss4ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }

  let body: ResolveBody;
  try {
    body = (await request.json()) as ResolveBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const files = Array.isArray(body.files) ? body.files : [];
  if (files.length === 0) {
    return NextResponse.json({ error: 'No files provided.' }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json(
      { error: `Too many files at once (max ${MAX_FILES}).` },
      { status: 400 }
    );
  }

  try {
    const orders = await getOrderBook();

    const matches = files.map((f) => {
      const name = String(f?.name ?? '').trim();
      if (!name) {
        return {
          fileName: '',
          size: f?.size ?? 0,
          category: 'additional' as const,
          categoryLabel: CATEGORY_LABELS.additional,
          categoryCertain: false,
          orderId: null,
          orderNumber: null,
          confidence: 'unresolved' as const,
          candidates: [],
          reason: 'This file has no name.',
          willSupersede: false,
        };
      }

      const m = matchByFileName(name, orders);
      return {
        fileName: name,
        size: f?.size ?? 0,
        category: m.category,
        categoryLabel: CATEGORY_LABELS[m.category],
        categoryCertain: m.categoryCertain,
        orderId: m.orderId,
        orderNumber: m.orderNumber,
        confidence: m.confidence,
        candidates: m.candidates,
        reason: m.reason,
        willSupersede: false,
      };
    });

    // Flag rows that would replace an existing document, so nothing is
    // superseded by surprise.
    const targetIds = [...new Set(matches.map((m) => m.orderId).filter((id): id is string => Boolean(id)))];
    const existing = await getExistingSlots(targetIds);
    for (const m of matches) {
      if (m.orderId && m.category !== 'additional') {
        m.willSupersede = existing.get(m.orderId)?.has(m.category) ?? false;
      }
    }

    const summary = {
      total: matches.length,
      resolved: matches.filter((m) => m.orderId).length,
      needsReview: matches.filter((m) => !m.orderId).length,
      superseding: matches.filter((m) => m.willSupersede).length,
      // Files whose order could not be found by name — candidates for reading
      // the document itself.
      readable: matches.filter((m) => !m.orderId && m.confidence === 'unresolved').length,
    };

    return NextResponse.json(
      { matches, summary, orderCount: orders.length },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not resolve the files.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
