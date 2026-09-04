/**
 * @file src/app/admin/(dashboard)/documents/_components/DocumentsWorkspace.tsx
 * @description Bulk document intake: drop files, review where each one is going,
 * commit.
 *
 * 1. Server vs Client choice rationale: Client Component. Files are held in
 *    browser memory through the review stage and uploaded one request at a time
 *    so progress can be shown and a single failure cannot lose the batch.
 * 2. Caching layer: none — every fetch is no-store.
 * 3. RBAC: the page is administrator-gated; every route re-checks.
 * 4. Revalidation: coverage refetches after each committed batch.
 *
 * NOTHING UPLOADS UNTIL COMMIT, and a row with no order is refused rather than
 * uploaded somewhere provisional: a document filed against the wrong LLC puts
 * one client's formation papers into another client's record.
 */

'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileUp, Loader2, Trash2, Upload, X } from 'lucide-react';
import type { OrderCoverage } from '@/lib/services/documents/orderBook';
import type { DocumentCategory, MatchConfidence, OrderCandidate } from '@/lib/services/documents/matcher';
import CoverageTable from './CoverageTable';
import { useBatchJob, summarize } from '@/context/batch-job-context';

interface Stats {
  totalOrders: number;
  activeOrders: number;
  missing: Record<string, number>;
}

interface DocumentsWorkspaceProps {
  initialCoverage: OrderCoverage[];
  initialStats: Stats;
}

/** One file in the review queue, paired with its resolved destination. */
interface Row {
  id: string;
  file: File;
  category: DocumentCategory;
  categoryCertain: boolean;
  orderId: string | null;
  orderNumber: string | null;
  confidence: MatchConfidence;
  candidates: OrderCandidate[];
  reason: string;
  willSupersede: boolean;
  /** Set once committed. */
  result?: { ok: boolean; message: string };
}

const CATEGORY_OPTIONS: { value: DocumentCategory; label: string }[] = [
  { value: 'articles_of_organization', label: 'Articles of Organization' },
  { value: 'operating_agreement', label: 'Operating Agreement' },
  { value: 'ein_letter', label: 'EIN Confirmation Letter' },
  { value: 'additional', label: 'Other Document' },
];

const CONFIDENCE_STYLE: Record<MatchConfidence, { bg: string; text: string; border: string; label: string }> = {
  'order-number': { bg: 'bg-[#d1fae5]', text: 'text-[#065f46]', border: 'border-[#a7f3d0]', label: 'Order no.' },
  'name-exact':   { bg: 'bg-[#d1fae5]', text: 'text-[#065f46]', border: 'border-[#a7f3d0]', label: 'Name' },
  content:        { bg: 'bg-[#dbeafe]', text: 'text-[#1e40af]', border: 'border-[#bfdbfe]', label: 'Read' },
  ambiguous:      { bg: 'bg-[#fef3c7]', text: 'text-[#92400e]', border: 'border-[#fde68a]', label: 'Ambiguous' },
  unresolved:     { bg: 'bg-[#fee2e2]', text: 'text-[#991b1b]', border: 'border-[#fecaca]', label: 'Needs order' },
};

export default function DocumentsWorkspace({
  initialCoverage,
  initialStats,
}: DocumentsWorkspaceProps): React.JSX.Element {
  const [coverage, setCoverage] = useState(initialCoverage);
  const [stats, setStats] = useState(initialStats);
  const [rows, setRows] = useState<Row[]>([]);
  const [resolving, setResolving] = useState(false);
  // The upload loop runs in the admin-layout provider, so switching pages
  // mid-batch does not abort it.
  const { job, isRunning, start } = useBatchJob();
  const committing = isRunning && job?.kind === 'documents';
  const progress = summarize(job);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  /** All orders, for the manual picker. */
  const orderOptions = useMemo(
    () => coverage.map((c) => ({ orderId: c.orderId, orderNumber: c.orderNumber, companyName: c.companyName, status: c.status })),
    [coverage]
  );

  const refreshCoverage = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/documents/coverage', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setCoverage(data.rows ?? []);
      setStats(data.stats ?? stats);
    } catch {
      // A failed refresh leaves stale counts, which is harmless.
    }
  }, [stats]);

  /** Sends filenames to the server for matching. No file content leaves yet. */
  const addFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    setError(null);
    setResolving(true);

    try {
      const res = await fetch('/api/admin/documents/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: files.map((f) => ({ name: f.name, size: f.size })) }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Could not work out where these files belong.');
        return;
      }

      const next: Row[] = files.map((file, i) => {
        const m = data.matches[i];
        return {
          id: `${file.name}-${file.size}-${Date.now()}-${i}`,
          file,
          category: m.category,
          categoryCertain: m.categoryCertain,
          orderId: m.orderId,
          orderNumber: m.orderNumber,
          confidence: m.confidence,
          candidates: m.candidates ?? [],
          reason: m.reason,
          willSupersede: m.willSupersede,
        };
      });

      // Rows needing attention sort to the top — that is the work.
      next.sort((a, b) => (a.orderId ? 1 : 0) - (b.orderId ? 1 : 0));
      setRows((prev) => [...next, ...prev]);
    } catch {
      setError('Could not reach the server.');
    } finally {
      setResolving(false);
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      void addFiles(Array.from(e.dataTransfer.files ?? []));
    },
    [addFiles]
  );

  const setRowOrder = (id: string, orderId: string) => {
    const order = orderOptions.find((o) => o.orderId === orderId);
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              orderId: orderId || null,
              orderNumber: order?.orderNumber ?? null,
              confidence: orderId ? ('name-exact' as MatchConfidence) : ('unresolved' as MatchConfidence),
              reason: orderId ? 'Chosen manually.' : 'No order selected.',
            }
          : r
      )
    );
  };

  const setRowCategory = (id: string, category: DocumentCategory) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, category, categoryCertain: true } : r)));
  };

  const removeRow = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));

  const ready = rows.filter((r) => r.orderId && !r.result?.ok);
  const blocked = rows.filter((r) => !r.orderId);

  /**
   * Uploads the ready rows one request at a time, through the persistent
   * runner. A failure on one file is recorded and the run moves on.
   */
  const commit = useCallback(() => {
    if (ready.length === 0) return;
    setError(null);

    const byId = new Map(ready.map((r) => [r.id, r]));

    const started = start(
      'documents',
      `Uploading ${ready.length} document${ready.length === 1 ? '' : 's'}`,
      ready.map((r) => ({ id: r.id, label: r.file.name })),
      async (item) => {
        const row = byId.get(item.id);
        if (!row || !row.orderId) {
          return { ok: false, message: 'This file lost its order selection.', retryable: false };
        }

        const body = new FormData();
        body.append('file', row.file);
        body.append('orderId', row.orderId);
        body.append('category', row.category);

        const res = await fetch('/api/admin/documents/bulk-upload', { method: 'POST', body });

        let data: Record<string, unknown>;
        try {
          data = await res.json();
        } catch {
          return { ok: false, message: `Server error (HTTP ${res.status}).`, retryable: true };
        }

        const message = res.ok
          ? `Filed on ${data.orderNumber}`
          : ((data.error as string) ?? 'Upload failed.');

        // Mark the row inline too, so the review table reflects the outcome.
        setRows((prev) =>
          prev.map((r) => (r.id === item.id ? { ...r, result: { ok: res.ok, message } } : r))
        );

        // A 4xx is a bad input — retrying sends the same thing again. A 5xx or
        // a storage failure is worth another attempt.
        return { ok: res.ok, message, retryable: res.status >= 500 || res.status === 429 };
      }
    );

    if (!started) {
      setError('Another batch is already running. Wait for it to finish, or stop it first.');
    }
  }, [ready, start]);

  const lastSeenJob = useRef<string | null>(null);
  useEffect(() => {
    if (!job || job.status === 'running' || job.kind !== 'documents') return;
    if (lastSeenJob.current === job.id) return;
    lastSeenJob.current = job.id;
    void refreshCoverage();
  }, [job, refreshCoverage]);

  const uploaded = rows.filter((r) => r.result?.ok).length;
  const failed = rows.filter((r) => r.result && !r.result.ok).length;

  return (
    <div className="space-y-6 font-inter pb-12">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-black font-manrope">Documents</h1>
        <p className="text-xs font-semibold text-gray-500">
          Upload in bulk — files are matched to their LLC order automatically
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 p-3.5 bg-[#fee2e2] border border-[#fecaca] rounded-lg">
          <AlertTriangle className="w-4 h-4 text-[#991b1b] mt-0.5 flex-shrink-0" />
          <p className="text-xs text-[#991b1b] leading-relaxed">{error}</p>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
        className={`flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed rounded-xl cursor-pointer transition ${
          dragging ? 'border-[#34088f] bg-[#f5f2fe]' : 'border-gray-200 bg-white hover:border-gray-300'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => { void addFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }}
        />
        {resolving ? (
          <Loader2 className="w-6 h-6 text-[#34088f] animate-spin" />
        ) : (
          <FileUp className="w-6 h-6 text-gray-400" />
        )}
        <p className="text-sm font-semibold text-gray-700">
          {resolving ? 'Working out where these belong…' : 'Drop documents here, or click to choose'}
        </p>
        <p className="text-xs text-gray-400 text-center max-w-md leading-relaxed">
          Files named with the order number (<span className="font-mono">FM-01143 - EIN 147C.pdf</span>) are
          matched exactly. Others are matched on company name.
        </p>
      </div>

      {/* Review queue */}
      {rows.length > 0 && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-gray-900 font-manrope">
              {rows.length} file{rows.length === 1 ? '' : 's'}
              {blocked.length > 0 && (
                <span className="ml-2 text-xs font-semibold text-[#991b1b]">
                  {blocked.length} need an order
                </span>
              )}
              {uploaded > 0 && (
                <span className="ml-2 text-xs font-semibold text-[#065f46]">{uploaded} uploaded</span>
              )}
              {failed > 0 && (
                <span className="ml-2 text-xs font-semibold text-[#991b1b]">{failed} failed</span>
              )}
            </h2>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setRows([])}
                disabled={committing}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition"
              >
                <X className="w-3.5 h-3.5" />
                Clear
              </button>
              <button
                onClick={commit}
                disabled={committing || ready.length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#34088f] rounded-lg hover:bg-[#2a0673] disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                {committing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                Upload {ready.length > 0 ? `(${ready.length})` : ''}
              </button>
            </div>
          </div>

          {committing && (
            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#34088f] transition-[width] duration-300"
                style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
              />
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['File', 'Category', 'LLC order', 'Match', ''].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const style = CONFIDENCE_STYLE[r.confidence];
                    return (
                      <tr key={r.id} className={`border-b border-gray-50 last:border-0 ${r.result?.ok ? 'bg-[#f0fdf4]' : ''}`}>
                        <td className="px-3 py-2.5 max-w-[260px]">
                          <div className="text-xs font-semibold text-gray-900 truncate" title={r.file.name}>
                            {r.file.name}
                          </div>
                          <div className="text-[11px] text-gray-400">
                            {(r.file.size / 1024).toFixed(0)} KB
                            {r.willSupersede && (
                              <span className="ml-1.5 text-[#92400e]">· replaces existing</span>
                            )}
                          </div>
                        </td>

                        <td className="px-3 py-2.5">
                          <select
                            value={r.category}
                            onChange={(e) => setRowCategory(r.id, e.target.value as DocumentCategory)}
                            disabled={committing || r.result?.ok}
                            className={`px-2 py-1 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#34088f]/20 ${
                              r.categoryCertain ? 'border-gray-200' : 'border-[#fde68a] bg-[#fffbeb]'
                            }`}
                          >
                            {CATEGORY_OPTIONS.map((c) => (
                              <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                          </select>
                        </td>

                        <td className="px-3 py-2.5">
                          <select
                            value={r.orderId ?? ''}
                            onChange={(e) => setRowOrder(r.id, e.target.value)}
                            disabled={committing || r.result?.ok}
                            className={`px-2 py-1 text-xs border rounded-lg max-w-[240px] focus:outline-none focus:ring-2 focus:ring-[#34088f]/20 ${
                              r.orderId ? 'border-gray-200' : 'border-[#fecaca] bg-[#fef2f2]'
                            }`}
                          >
                            <option value="">— choose an order —</option>
                            {(r.candidates.length > 0 ? r.candidates : orderOptions).map((o) => (
                              <option key={o.orderId} value={o.orderId}>
                                {o.orderNumber} · {o.companyName || 'unnamed'}
                              </option>
                            ))}
                            {r.candidates.length > 0 && <option disabled>──────────</option>}
                            {r.candidates.length > 0 &&
                              orderOptions.map((o) => (
                                <option key={`all-${o.orderId}`} value={o.orderId}>
                                  {o.orderNumber} · {o.companyName || 'unnamed'}
                                </option>
                              ))}
                          </select>
                        </td>

                        <td className="px-3 py-2.5">
                          {r.result ? (
                            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${r.result.ok ? 'text-[#065f46]' : 'text-[#991b1b]'}`}>
                              {r.result.ok && <CheckCircle2 className="w-3 h-3" />}
                              {r.result.message}
                            </span>
                          ) : (
                            <>
                              <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded border ${style.bg} ${style.text} ${style.border}`}>
                                {style.label}
                              </span>
                              <div className="text-[11px] text-gray-400 mt-0.5 max-w-[220px] leading-snug">{r.reason}</div>
                            </>
                          )}
                        </td>

                        <td className="px-3 py-2.5">
                          <button
                            onClick={() => removeRow(r.id)}
                            disabled={committing}
                            aria-label={`Remove ${r.file.name}`}
                            className="p-1.5 text-gray-400 hover:text-[#991b1b] hover:bg-red-50 rounded-lg disabled:opacity-40 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      <CoverageTable rows={coverage} stats={stats} />
    </div>
  );
}
