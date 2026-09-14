/**
 * @file src/lib/services/ss4/records.ts
 * @description Reads the generated-document records shown in the EIN table.
 */

import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Ss4Status, Ss4TriggerSource } from './types';

export interface Ss4Record {
  id: string;
  orderId: string;
  orderNumber: string;
  status: Ss4Status;
  failureReason: string | null;
  companyName: string | null;
  addressUsed: string | null;
  memberCount: number | null;
  attemptCount: number;
  documentUrl: string | null;
  pageCount: number | null;
  articlesPages: number | null;
  batchId: string | null;
  triggerSource: Ss4TriggerSource;
  createdAt: string;
  /** Present when the responsible-party check flagged something. */
  verificationStatus: string | null;
  verificationNote: string | null;
}

export interface RecordFilters {
  status?: Ss4Status | 'all';
  batchId?: string;
  q?: string;
  limit?: number;
}

interface RecordRow {
  id: string;
  order_id: string;
  order_number: string;
  status: Ss4Status;
  failure_reason: string | null;
  company_name: string | null;
  address_used: string | null;
  member_count: number | null;
  attempt_count: number;
  document_url: string | null;
  page_count: number | null;
  articles_pages: number | null;
  batch_id: string | null;
  trigger_source: Ss4TriggerSource;
  created_at: string;
  verification: { status?: string; note?: string } | null;
}

function fromRow(row: RecordRow): Ss4Record {
  return {
    id: row.id,
    orderId: row.order_id,
    orderNumber: row.order_number,
    status: row.status,
    failureReason: row.failure_reason,
    companyName: row.company_name,
    addressUsed: row.address_used,
    memberCount: row.member_count,
    attemptCount: row.attempt_count,
    documentUrl: row.document_url,
    pageCount: row.page_count,
    articlesPages: row.articles_pages,
    batchId: row.batch_id,
    triggerSource: row.trigger_source,
    createdAt: row.created_at,
    verificationStatus: row.verification?.status ?? null,
    verificationNote: row.verification?.note ?? null,
  };
}

/**
 * The records table. Newest first — an order regenerated at a higher attempt
 * keeps its earlier rows, because the packet that was actually filed has to
 * stay retrievable.
 */
export async function getSs4Records(filters: RecordFilters = {}): Promise<Ss4Record[]> {
  let query = createAdminClient()
    .from('ss4_documents')
    .select(
      'id, order_id, order_number, status, failure_reason, company_name, address_used, ' +
        'member_count, attempt_count, document_url, page_count, articles_pages, batch_id, ' +
        'trigger_source, created_at, verification'
    )
    .order('created_at', { ascending: false })
    .limit(filters.limit ?? 200);

  if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);
  if (filters.batchId) query = query.eq('batch_id', filters.batchId);
  if (filters.q) {
    const term = filters.q.replace(/[%,]/g, '').trim();
    if (term) {
      query = query.or(`order_number.ilike.%${term}%,company_name.ilike.%${term}%`);
    }
  }

  const { data, error } = await query;
  if (error) throw new Error(`Could not read SS-4 records: ${error.message}`);

  return ((data ?? []) as unknown as RecordRow[]).map(fromRow);
}

export interface Ss4Stats {
  total: number;
  passed: number;
  failed: number;
  atCap: number;
}

/** Headline counts for the EIN page. */
export async function getSs4Stats(): Promise<Ss4Stats> {
  const db = createAdminClient();

  const [total, passed, failed, atCap] = await Promise.all([
    db.from('ss4_documents').select('*', { count: 'exact', head: true }),
    db.from('ss4_documents').select('*', { count: 'exact', head: true }).eq('status', 'passed'),
    db.from('ss4_documents').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
    db.from('ss4_batch_attempts').select('*', { count: 'exact', head: true }).gte('attempt', 6),
  ]);

  return {
    total: total.count ?? 0,
    passed: passed.count ?? 0,
    failed: failed.count ?? 0,
    atCap: atCap.count ?? 0,
  };
}
