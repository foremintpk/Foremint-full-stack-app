/**
 * @file src/app/api/admin/ss4/download-all/route.ts
 * @description Bundles generated SS-4 packets into a single ZIP.
 *
 * Accepts either a batch id (everything from one run) or an explicit list of
 * record ids. Only `passed` records have a stored document, so failures are
 * skipped and reported in the response headers rather than producing an empty
 * entry in the archive.
 */

import { NextResponse } from 'next/server';
import JSZip from 'jszip';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireSs4Admin, Ss4ForbiddenError } from '@/lib/services/ss4/guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

interface DownloadBody {
  batchId?: string;
  recordIds?: string[];
}

interface PacketRow {
  id: string;
  order_number: string;
  company_name: string | null;
  attempt_count: number;
  created_at: string;
  document_url: string | null;
}

/** Strips characters that are illegal in ZIP entry names on Windows. */
function safeEntryName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim();
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

  let body: DownloadBody;
  try {
    body = (await request.json()) as DownloadBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  let query = createAdminClient()
    .from('ss4_documents')
    .select('id, order_number, company_name, attempt_count, created_at, document_url')
    .eq('status', 'passed')
    .not('document_url', 'is', null)
    .order('order_number');

  if (body.batchId) {
    query = query.eq('batch_id', body.batchId);
  } else if (body.recordIds?.length) {
    query = query.in('id', body.recordIds);
  } else {
    return NextResponse.json(
      { error: 'Provide either batchId or recordIds.' },
      { status: 400 }
    );
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as PacketRow[];
  if (rows.length === 0) {
    return NextResponse.json(
      { error: 'No generated documents match that selection.' },
      { status: 404 }
    );
  }

  const zip = new JSZip();
  const failures: string[] = [];
  const usedNames = new Set<string>();

  /**
   * Two runs of the same order at the same attempt produce the same base name —
   * routine once an order reaches the cap, where every run is attempt 6. JSZip
   * silently overwrites a duplicate entry, so a collision would drop a file
   * while still counting it as included. Suffix instead of overwrite.
   */
  function uniqueEntryName(row: PacketRow): string {
    const base = safeEntryName(
      `${row.order_number} - ${row.company_name ?? 'SS-4'} - attempt ${row.attempt_count}`
    );
    if (!usedNames.has(`${base}.pdf`)) {
      usedNames.add(`${base}.pdf`);
      return `${base}.pdf`;
    }
    // Date first, since that is what distinguishes two runs to a human.
    const stamp = row.created_at.slice(0, 19).replace('T', ' ').replace(/:/g, '-');
    let candidate = `${base} (${stamp}).pdf`;
    let n = 2;
    while (usedNames.has(candidate)) candidate = `${base} (${stamp}) ${n++}.pdf`;
    usedNames.add(candidate);
    return candidate;
  }

  // Fetched in parallel; one unreachable file must not lose the whole archive.
  const fetched = await Promise.all(
    rows.map(async (row) => {
      try {
        const response = await fetch(row.document_url as string);
        if (!response.ok) {
          failures.push(`${row.order_number} (HTTP ${response.status})`);
          return null;
        }
        return { row, buffer: await response.arrayBuffer() };
      } catch {
        failures.push(`${row.order_number} (unreachable)`);
        return null;
      }
    })
  );

  // Named in a second, sequential pass so entry names are assigned in a stable
  // order rather than whichever download happened to finish first.
  for (const item of fetched) {
    if (item) zip.file(uniqueEntryName(item.row), item.buffer);
  }

  // Counted from the archive itself, so the header can never claim more files
  // than the ZIP actually holds.
  const included = usedNames.size;
  if (included === 0) {
    return NextResponse.json(
      { error: `None of the ${rows.length} documents could be downloaded.` },
      { status: 502 }
    );
  }

  const archive = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(new Uint8Array(archive), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="ss4-packets-${stamp}.zip"`,
      'Cache-Control': 'private, no-store',
      // Surfaced so the UI can warn that the archive is short a few files.
      'X-Ss4-Included': String(included),
      'X-Ss4-Skipped': String(failures.length),
    },
  });
}
