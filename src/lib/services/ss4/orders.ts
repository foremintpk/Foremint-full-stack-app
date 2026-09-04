/**
 * @file src/lib/services/ss4/orders.ts
 * @description Lists the EIN-pending order book with each order's documents and
 * attempt position.
 *
 * 1. Server vs Client choice rationale: Server-only; reads through the admin
 *    client because ss4_batch_attempts is service-role-only.
 * 2. Caching layer: None. The EIN page must show the live ladder — a stale
 *    attempt number would mislabel a filed federal form.
 * 3. RBAC: Callers are administrator-gated.
 * 4. Revalidation: revalidateTag('ss4-orders') after a generation run.
 *
 * Pure SQL — no model calls, so listing the book costs nothing.
 */

import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAttempts, isAtCap, nextAttemptFor } from './state';
import type { Ss4OrderRow } from './types';

/** The order status that feeds the SS-4 pipeline. */
const EIN_PENDING = 'ein_pending';

interface OrderRecord {
  id: string;
  order_number: string | null;
  created_at: string | null;
  form_snapshot: Record<string, unknown> | null;
}

interface DocumentRecord {
  order_id: string | null;
  file_name: string | null;
  url: string | null;
  document_type: string | null;
  slot_key: string | null;
}

const clean = (v: unknown): string => String(v ?? '').replace(/\s+/g, ' ').trim();

/**
 * Members live under different shapes depending on when the order was taken:
 * newer snapshots nest them under step4, older ones keep them at the root.
 */
function readMemberNames(snapshot: Record<string, unknown>): string[] {
  const step4 = snapshot.step4 as { members?: unknown } | undefined;
  const raw = step4?.members ?? snapshot.members;
  if (!Array.isArray(raw)) return [];

  return raw
    .map((m) => clean((m as Record<string, unknown>)?.fullName))
    .filter(Boolean);
}

function readBusinessName(snapshot: Record<string, unknown>): string {
  const step3 = snapshot.step3 as { businessName?: unknown } | undefined;
  return clean(step3?.businessName ?? snapshot.businessName);
}

/**
 * The current EIN-pending book, paired with the attempt ladder.
 *
 * Orders with no Articles on file are still returned — they appear in the table
 * with a warning rather than vanishing, because an operator needs to see that a
 * document is missing.
 */
export async function getEinPendingOrders(): Promise<Ss4OrderRow[]> {
  const db = createAdminClient();

  const { data: orders, error } = await db
    .from('orders')
    .select('id, order_number, created_at, form_snapshot')
    .eq('status', EIN_PENDING)
    .order('order_number');

  if (error) throw new Error(`Could not read EIN-pending orders: ${error.message}`);

  const list = (orders ?? []) as unknown as OrderRecord[];
  if (list.length === 0) return [];

  const { data: docs, error: docErr } = await db
    .from('documents')
    .select('order_id, file_name, url, document_type, slot_key')
    .in('order_id', list.map((o) => o.id))
    .is('superseded_at', null);

  if (docErr) throw new Error(`Could not read order documents: ${docErr.message}`);

  // First match wins: documents come back newest-first within a slot, and
  // superseded versions are already filtered out above.
  const articlesByOrder = new Map<string, DocumentRecord>();
  const identityByOrder = new Map<string, DocumentRecord>();

  for (const d of (docs ?? []) as unknown as DocumentRecord[]) {
    if (!d.order_id) continue;

    const isArticles =
      d.slot_key === 'articles_of_organization' || /article/i.test(d.document_type ?? '');
    if (isArticles && !articlesByOrder.has(d.order_id)) {
      articlesByOrder.set(d.order_id, d);
    }
    if (d.document_type === 'identity' && !identityByOrder.has(d.order_id)) {
      identityByOrder.set(d.order_id, d);
    }
  }

  const orderNumbers = list.map((o) => clean(o.order_number)).filter(Boolean);
  const attempts = await getAttempts(orderNumbers);

  return list.map((o) => {
    const snapshot = o.form_snapshot ?? {};
    const orderNumber = clean(o.order_number);
    const memberNames = readMemberNames(snapshot);
    const articles = articlesByOrder.get(o.id);
    const sentAttempts = attempts[orderNumber] ?? 0;

    return {
      orderId: o.id,
      orderNumber,
      llcName: readBusinessName(snapshot),
      // members[0] is the actual LLC member; the snapshot's fullName can be the
      // account holder, who is not necessarily the responsible party.
      responsibleName: memberNames[0] || clean(snapshot.fullName),
      members: memberNames.length || 1,
      memberNames,
      articlesUrl: articles?.url ?? null,
      articlesFileName: articles?.file_name ?? null,
      identityUrl: identityByOrder.get(o.id)?.url ?? null,
      orderPlacedAt: o.created_at,
      sentAttempts,
      nextAttempt: nextAttemptFor(sentAttempts),
      atCap: isAtCap(sentAttempts),
    };
  });
}

/** A single order by number, for a one-off regeneration. */
export async function getEinPendingOrder(orderNumber: string): Promise<Ss4OrderRow | null> {
  const all = await getEinPendingOrders();
  return all.find((o) => o.orderNumber === orderNumber) ?? null;
}
