/**
 * @file src/lib/services/ss4/state.ts
 * @description Durable state for the SS-4 pipeline: the attempt ladder, parsed
 * Articles, and responsible-party names read off identity documents.
 *
 * Ported from ss4-app, where this lived in a separate Supabase project. It now
 * uses Foremint's own admin client — there is one database.
 *
 * The attempt ladder is the part that matters most: it decides which banner is
 * printed on a filed federal form. Advancing it goes through the
 * record_ss4_attempt RPC, which does the read-modify-write in one atomic
 * statement and saturates at 6, so two concurrent batch runs cannot both claim
 * the same attempt and a 7th run reproduces the 6th packet exactly.
 */

import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Extraction } from './extract';
import type { NameVerification } from './verify';

/** The hard ceiling on the attempt ladder. Mirrored by a CHECK constraint. */
export const MAX_ATTEMPTS = 6;

const ATTEMPTS = 'ss4_batch_attempts';
const CACHE = 'ss4_articles_cache';
const NAMES = 'ss4_name_verifications';

/**
 * Attempts already SENT per order. An order with no row has never been
 * submitted, so its next packet is attempt 1 — the plain, unbannered form.
 */
export async function getAttempts(orderNumbers: string[]): Promise<Record<string, number>> {
  if (orderNumbers.length === 0) return {};

  const { data, error } = await createAdminClient()
    .from(ATTEMPTS)
    .select('order_number, attempt')
    .in('order_number', orderNumbers);

  if (error) throw new Error(`Could not read the attempt ladder: ${error.message}`);

  const map: Record<string, number> = {};
  for (const row of (data ?? []) as { order_number: string; attempt: number }[]) {
    map[row.order_number] = row.attempt;
  }
  return map;
}

/**
 * Advances the ladder and returns the attempt number actually recorded.
 *
 * At the cap this is a no-op that still returns 6 — generation continues, but
 * the counter and therefore the banner stay pinned, so every run past the sixth
 * produces an identical document.
 */
export async function recordAttempt(
  orderNumber: string,
  companyName: string | null
): Promise<number> {
  const { data, error } = await createAdminClient().rpc('record_ss4_attempt', {
    p_order_number: orderNumber,
    p_company_name: companyName,
  });

  if (error) throw new Error(`Could not record the attempt: ${error.message}`);
  return Number(data);
}

/**
 * What the NEXT packet for this order would carry, without recording anything.
 * Used by the listing so an operator sees the number before committing to a run.
 */
export function nextAttemptFor(sentAttempts: number): number {
  return Math.min(sentAttempts + 1, MAX_ATTEMPTS);
}

/** True when this order has exhausted its ladder and output can no longer change. */
export function isAtCap(sentAttempts: number): boolean {
  return sentAttempts >= MAX_ATTEMPTS;
}

/**
 * Previously parsed Articles, keyed by document URL. Cloudinary URLs are
 * version-stamped, so a replaced document arrives under a new URL and misses.
 */
export async function getCachedExtraction(articlesUrl: string): Promise<Extraction | null> {
  const { data, error } = await createAdminClient()
    .from(CACHE)
    .select('extraction')
    .eq('articles_url', articlesUrl)
    .maybeSingle();

  if (error) throw new Error(`Could not read the Articles cache: ${error.message}`);
  if (!data) return null;
  return (data as { extraction: Extraction }).extraction;
}

export async function putCachedExtraction(
  articlesUrl: string,
  extraction: Extraction
): Promise<void> {
  const { error } = await createAdminClient()
    .from(CACHE)
    .upsert(
      { articles_url: articlesUrl, extraction, source: extraction.source },
      { onConflict: 'articles_url' }
    );

  // A cache write failing must not lose an already-generated packet; the next
  // run simply re-reads the document.
  if (error && process.env.NODE_ENV !== 'production') {
    console.warn(`[ss4] could not cache extraction for ${articlesUrl}: ${error.message}`);
  }
}

/** A previously read identity document, keyed by its URL. */
export async function getCachedName(documentUrl: string): Promise<NameVerification | null> {
  const { data, error } = await createAdminClient()
    .from(NAMES)
    .select('id_name, source, status, note')
    .eq('document_url', documentUrl)
    .maybeSingle();

  if (error) throw new Error(`Could not read the name cache: ${error.message}`);
  if (!data) return null;

  const row = data as {
    id_name: string | null;
    source: string;
    status: string;
    note: string | null;
  };
  return {
    idName: row.id_name,
    source: row.source as NameVerification['source'],
    status: row.status as NameVerification['status'],
    note: row.note ?? undefined,
  };
}

export async function putCachedName(
  documentUrl: string,
  verification: NameVerification
): Promise<void> {
  const { error } = await createAdminClient()
    .from(NAMES)
    .upsert(
      {
        document_url: documentUrl,
        id_name: verification.idName,
        source: verification.source,
        status: verification.status,
        note: verification.note ?? null,
      },
      { onConflict: 'document_url' }
    );

  // As above: a failed cache write must not discard a verification that succeeded.
  if (error && process.env.NODE_ENV !== 'production') {
    console.warn(`[ss4] could not cache name verification for ${documentUrl}: ${error.message}`);
  }
}
