/**
 * @file src/lib/services/documents/orderBook.ts
 * @description The order list the matcher routes against, plus per-order
 * document coverage.
 */

import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type { DocumentCategory, OrderCandidate } from './matcher';

/** Categories tracked by the coverage view. */
export const TRACKED_CATEGORIES: DocumentCategory[] = [
  'articles_of_organization',
  'operating_agreement',
  'ein_letter',
];

export interface OrderCoverage extends OrderCandidate {
  /** Which tracked categories already have an active document. */
  has: Record<DocumentCategory, boolean>;
  additionalCount: number;
}

interface OrderRow {
  id: string;
  order_number: string | null;
  status: string;
  form_snapshot: Record<string, unknown> | null;
}

function readBusinessName(snapshot: Record<string, unknown> | null): string {
  const s = snapshot ?? {};
  const step3 = s.step3 as { businessName?: unknown } | undefined;
  return String(step3?.businessName ?? s.businessName ?? '').replace(/\s+/g, ' ').trim();
}

/** Every order with an order number, for filename matching. */
export async function getOrderBook(): Promise<OrderCandidate[]> {
  const { data, error } = await createAdminClient()
    .from('orders')
    .select('id, order_number, status, form_snapshot')
    .order('order_number', { ascending: false });

  if (error) throw new Error(`Could not read the order book: ${error.message}`);

  return ((data ?? []) as unknown as OrderRow[])
    .filter((o) => o.order_number)
    .map((o) => ({
      orderId: o.id,
      orderNumber: o.order_number as string,
      companyName: readBusinessName(o.form_snapshot),
      status: o.status,
    }));
}

/** The order book plus which documents each order already has. */
export async function getCoverage(): Promise<OrderCoverage[]> {
  const db = createAdminClient();

  const [orders, docsResult] = await Promise.all([
    getOrderBook(),
    db.from('documents').select('order_id, slot_key').is('superseded_at', null),
  ]);

  if (docsResult.error) {
    throw new Error(`Could not read documents: ${docsResult.error.message}`);
  }

  const rows = (docsResult.data ?? []) as unknown as { order_id: string | null; slot_key: string | null }[];

  const bySlot = new Map<string, Set<string>>();
  const additional = new Map<string, number>();
  for (const d of rows) {
    if (!d.order_id) continue;
    if (d.slot_key === 'additional') {
      additional.set(d.order_id, (additional.get(d.order_id) ?? 0) + 1);
      continue;
    }
    if (!d.slot_key) continue;
    if (!bySlot.has(d.slot_key)) bySlot.set(d.slot_key, new Set());
    bySlot.get(d.slot_key)!.add(d.order_id);
  }

  return orders.map((o) => ({
    ...o,
    has: TRACKED_CATEGORIES.reduce(
      (acc, cat) => {
        acc[cat] = bySlot.get(cat)?.has(o.orderId) ?? false;
        return acc;
      },
      {} as Record<DocumentCategory, boolean>
    ),
    additionalCount: additional.get(o.orderId) ?? 0,
  }));
}

/**
 * Which of these orders already hold an active document in a given slot.
 * Used to warn before an upload supersedes something.
 */
export async function getExistingSlots(
  orderIds: string[]
): Promise<Map<string, Set<string>>> {
  if (orderIds.length === 0) return new Map();

  const { data, error } = await createAdminClient()
    .from('documents')
    .select('order_id, slot_key')
    .in('order_id', orderIds)
    .is('superseded_at', null);

  if (error) throw new Error(`Could not check existing documents: ${error.message}`);

  const map = new Map<string, Set<string>>();
  for (const d of (data ?? []) as unknown as { order_id: string | null; slot_key: string | null }[]) {
    if (!d.order_id || !d.slot_key) continue;
    if (!map.has(d.order_id)) map.set(d.order_id, new Set());
    map.get(d.order_id)!.add(d.slot_key);
  }
  return map;
}
