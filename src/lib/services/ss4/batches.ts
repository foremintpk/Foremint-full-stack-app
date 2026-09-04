/**
 * @file src/lib/services/ss4/batches.ts
 * @description Groups generated SS-4 records into the runs that produced them,
 * and deletes them.
 *
 * The records table was previously a flat list of every packet ever generated,
 * which becomes unreadable after a few runs. Grouping by batch_id matches how
 * the work actually happens: one run, one collapsible group.
 */

import 'server-only';
import { v2 as cloudinary } from 'cloudinary';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Ss4Record } from './records';
import type { Ss4TriggerSource } from './types';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface Ss4Batch {
  batchId: string;
  /** When the run started — the earliest record in the group. */
  createdAt: string;
  trigger: Ss4TriggerSource;
  total: number;
  passed: number;
  failed: number;
  records: Ss4Record[];
}

/** Groups records into runs, newest first. */
export function groupIntoBatches(records: Ss4Record[]): Ss4Batch[] {
  const byBatch = new Map<string, Ss4Record[]>();

  for (const r of records) {
    // Rows predating batch tracking are grouped under their own id so they
    // still appear rather than vanishing from the table.
    const key = r.batchId ?? `single-${r.id}`;
    if (!byBatch.has(key)) byBatch.set(key, []);
    byBatch.get(key)!.push(r);
  }

  const batches: Ss4Batch[] = [];
  for (const [batchId, group] of byBatch) {
    const sorted = [...group].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    batches.push({
      batchId,
      createdAt: sorted[0].createdAt,
      trigger: sorted[0].triggerSource,
      total: group.length,
      passed: group.filter((r) => r.status === 'passed').length,
      failed: group.filter((r) => r.status === 'failed').length,
      records: [...group].sort((a, b) => a.orderNumber.localeCompare(b.orderNumber)),
    });
  }

  return batches.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export interface DeleteResult {
  deleted: number;
  /** Files that could not be removed from storage; the rows still went. */
  storageFailures: string[];
  error?: string;
}

/**
 * Removes stored files, then their rows.
 *
 * Storage first: a row deleted while its file survives leaves an orphan nobody
 * can find or clean up, whereas a file deleted while the row survives is
 * visible and fixable. Neither is good, so a storage failure is reported rather
 * than swallowed — but it does not block the row deletion the operator asked for.
 *
 * The attempt ladder is deliberately NOT rewound. The attempt was genuinely
 * consumed; deleting the stored copy does not un-send it, and rewinding would
 * make the next packet carry a banner that has already gone out.
 */
async function deleteRecords(rows: { id: string; document_public_id: string | null; order_number: string }[]): Promise<DeleteResult> {
  const db = createAdminClient();
  const storageFailures: string[] = [];

  await Promise.all(
    rows.map(async (r) => {
      if (!r.document_public_id) return;
      try {
        await cloudinary.uploader.destroy(r.document_public_id, { resource_type: 'raw' });
      } catch {
        storageFailures.push(r.order_number);
      }
    })
  );

  const { error } = await db.from('ss4_documents').delete().in('id', rows.map((r) => r.id));
  if (error) return { deleted: 0, storageFailures, error: error.message };

  return { deleted: rows.length, storageFailures };
}

/** Deletes one generated packet. */
export async function deleteSs4Record(recordId: string): Promise<DeleteResult> {
  const { data, error } = await createAdminClient()
    .from('ss4_documents')
    .select('id, document_public_id, order_number')
    .eq('id', recordId)
    .maybeSingle();

  if (error) return { deleted: 0, storageFailures: [], error: error.message };
  if (!data) return { deleted: 0, storageFailures: [], error: 'That record no longer exists.' };

  return deleteRecords([data as never]);
}

/** Deletes every packet produced by one run. */
export async function deleteSs4Batch(batchId: string): Promise<DeleteResult> {
  const db = createAdminClient();

  // A group keyed "single-<id>" is a legacy row with no batch_id of its own.
  if (batchId.startsWith('single-')) {
    return deleteSs4Record(batchId.slice('single-'.length));
  }

  const { data, error } = await db
    .from('ss4_documents')
    .select('id, document_public_id, order_number')
    .eq('batch_id', batchId);

  if (error) return { deleted: 0, storageFailures: [], error: error.message };
  if (!data || data.length === 0) {
    return { deleted: 0, storageFailures: [], error: 'That batch no longer exists.' };
  }

  return deleteRecords(data as never);
}
