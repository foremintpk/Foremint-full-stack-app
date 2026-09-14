/**
 * @file src/app/admin/(dashboard)/ein/_components/BatchList.tsx
 * @description Generated packets, grouped into the runs that produced them.
 *
 * A flat list of every packet ever generated becomes unreadable after a few
 * runs, so each run is one collapsed row carrying its name, trigger, date and
 * counts, plus Download-all and Delete. Expanding it reveals the individual
 * packets, each with its own view and delete.
 *
 * Documents open through /api/admin/ss4/documents/[id]/view — an authenticated
 * route that proxies the bytes — never a raw Cloudinary URL, because an SS-4
 * carries the responsible party's name and address.
 */

'use client';

import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Download,
  ExternalLink,
  Loader2,
  Trash2,
} from 'lucide-react';
import type { Ss4Record } from '@/lib/services/ss4/records';
import type { Ss4Status, Ss4TriggerSource } from '@/lib/services/ss4/types';

export interface Ss4Batch {
  batchId: string;
  createdAt: string;
  trigger: Ss4TriggerSource;
  total: number;
  passed: number;
  failed: number;
  records: Ss4Record[];
}

interface BatchListProps {
  batches: Ss4Batch[];
  onDownloadBatch: (batchId: string) => void;
  onDeleted: () => void;
  zipping: boolean;
}

const STATUS_STYLES: Record<Ss4Status, { bg: string; text: string; border: string; label: string }> = {
  pending: { bg: 'bg-[#fef3c7]', text: 'text-[#92400e]', border: 'border-[#fde68a]', label: 'Pending' },
  passed: { bg: 'bg-[#d1fae5]', text: 'text-[#065f46]', border: 'border-[#a7f3d0]', label: 'Passed' },
  failed: { bg: 'bg-[#fee2e2]', text: 'text-[#991b1b]', border: 'border-[#fecaca]', label: 'Failed' },
};

/** "Manual run · 3 Sep 2026, 6:14 PM" — the batch's own name. */
function batchName(b: Ss4Batch): string {
  const label = b.trigger === 'automatic' ? 'Scheduled run' : 'Manual run';
  const d = new Date(b.createdAt);
  const date = d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${label} · ${date}, ${time}`;
}

export default function BatchList({
  batches,
  onDownloadBatch,
  onDeleted,
  zipping,
}: BatchListProps): React.JSX.Element {
  const [open, setOpen] = useState<Set<string>>(new Set());

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The scheduled-run email links to ?batch=<id>. Open and scroll to that run
  // so the download button is the first thing in view.
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get('batch');
    if (!wanted) return;
    if (!batches.some((b) => b.batchId === wanted)) return;

    setOpen((prev) => new Set(prev).add(wanted));
    // Defer until the row has rendered expanded.
    requestAnimationFrame(() => {
      document
        .getElementById(`ss4-batch-${wanted}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, [batches]);

  const toggle = (id: string) => {
    const next = new Set(open);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setOpen(next);
  };

  const remove = async (params: { batchId?: string; recordId?: string }, confirmText: string) => {
    if (!confirm(confirmText)) return;
    const key = params.batchId ?? params.recordId ?? '';
    setBusy(key);
    setError(null);
    try {
      const qs = params.batchId
        ? `batchId=${encodeURIComponent(params.batchId)}`
        : `recordId=${encodeURIComponent(params.recordId as string)}`;
      const res = await fetch(`/api/admin/ss4/batches?${qs}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not delete.');
        return;
      }
      if (data.warning) setError(data.warning);
      onDeleted();
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(null);
    }
  };

  if (batches.length === 0) {
    return (
      <div className="p-8 text-center bg-white border border-gray-200 rounded-xl">
        <p className="text-sm text-gray-500">
          No documents generated yet. Select orders above and start a run.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="flex items-start gap-2.5 p-3 bg-[#fef3c7] border border-[#fde68a] rounded-lg">
          <AlertCircle className="w-4 h-4 text-[#92400e] mt-0.5 flex-shrink-0" />
          <p className="text-xs text-[#92400e] leading-relaxed">{error}</p>
        </div>
      )}

      {batches.map((b) => {
        const isOpen = open.has(b.batchId);
        const isBusy = busy === b.batchId;

        return (
          <div
            key={b.batchId}
            id={`ss4-batch-${b.batchId}`}
            className="bg-white border border-gray-200 rounded-xl overflow-hidden scroll-mt-6"
          >
            {/* Collapsed summary — the run's name, counts, and its two actions */}
            <div className="flex flex-wrap items-center gap-3 p-3.5">
              <button
                onClick={() => toggle(b.batchId)}
                aria-expanded={isOpen}
                className="flex items-center gap-2 flex-1 min-w-0 text-left group"
              >
                {isOpen ? (
                  <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-900 truncate group-hover:text-[#34088f] transition">
                    {batchName(b)}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {b.total} document{b.total === 1 ? '' : 's'} · {b.passed} passed
                    {b.failed > 0 && <span className="text-[#991b1b]"> · {b.failed} failed</span>}
                  </p>
                </div>
              </button>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => onDownloadBatch(b.batchId)}
                  disabled={zipping || b.passed === 0}
                  title={b.passed === 0 ? 'Nothing to download — every packet in this run failed.' : undefined}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold text-white bg-[#34088f] rounded-lg hover:bg-[#2a0673] disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  {zipping ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                  ZIP ({b.passed})
                </button>

                <button
                  onClick={() =>
                    remove(
                      { batchId: b.batchId },
                      `Delete all ${b.total} document(s) from "${batchName(b)}"?\n\nThe stored PDFs are removed permanently. Attempt counts are not rewound — those submissions already went out.`
                    )
                  }
                  disabled={isBusy}
                  aria-label="Delete this batch"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold text-[#991b1b] bg-white border border-[#fecaca] rounded-lg hover:bg-red-50 disabled:opacity-40 transition"
                >
                  {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  Delete
                </button>
              </div>
            </div>

            {/* Expanded — the individual packets */}
            {isOpen && (
              <div className="border-t border-gray-100 overflow-x-auto">
                <table className="w-full min-w-[760px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {['Company', 'Address used', 'Status', 'Attempt', ''].map((h) => (
                        <th
                          key={h}
                          className="px-3 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.records.map((r) => {
                      const style = STATUS_STYLES[r.status];
                      const rowBusy = busy === r.id;
                      return (
                        <tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition">
                          <td className="px-3 py-2 max-w-[220px]">
                            <div className="text-xs font-semibold text-gray-900 truncate" title={r.companyName ?? ''}>
                              {r.companyName || <span className="text-gray-400">—</span>}
                            </div>
                            <div className="text-[11px] text-gray-400 tabular-nums">{r.orderNumber}</div>
                          </td>

                          <td className="px-3 py-2 text-xs text-gray-600 max-w-[240px] truncate" title={r.addressUsed ?? ''}>
                            {r.addressUsed || <span className="text-gray-400">—</span>}
                          </td>

                          <td className="px-3 py-2">
                            <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded border ${style.bg} ${style.text} ${style.border}`}>
                              {style.label}
                            </span>
                            {r.failureReason && (
                              <div className="text-[11px] text-[#991b1b] mt-1 max-w-[260px] leading-snug line-clamp-2" title={r.failureReason}>
                                {r.failureReason}
                              </div>
                            )}
                          </td>

                          <td className="px-3 py-2 whitespace-nowrap">
                            <span
                              className={`text-xs font-semibold tabular-nums ${
                                r.attemptCount >= 6 ? 'text-[#9a3412]' : 'text-gray-600'
                              }`}
                            >
                              {r.attemptCount} / 6
                            </span>
                          </td>

                          <td className="px-3 py-2">
                            <div className="flex items-center justify-end gap-1">
                              {r.documentUrl && (
                                <a
                                  // Authenticated proxy route, not the raw storage URL.
                                  href={`/api/admin/ss4/documents/${r.id}/view`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-[#34088f] hover:bg-[#f5f2fe] rounded-lg transition"
                                >
                                  View
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                              <button
                                onClick={() =>
                                  remove(
                                    { recordId: r.id },
                                    `Delete the packet for ${r.orderNumber} (${r.companyName ?? 'unnamed'})?\n\nThe stored PDF is removed permanently.`
                                  )
                                }
                                disabled={rowBusy}
                                aria-label={`Delete ${r.orderNumber}`}
                                className="p-1.5 text-gray-400 hover:text-[#991b1b] hover:bg-red-50 rounded-lg disabled:opacity-40 transition"
                              >
                                {rowBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
