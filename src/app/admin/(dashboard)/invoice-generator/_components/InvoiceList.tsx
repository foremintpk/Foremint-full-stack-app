/**
 * @file src/app/admin/(dashboard)/invoice-generator/_components/InvoiceList.tsx
 * @description Stored invoices: search, view, edit, rename, delete.
 *
 * Collapsed by default — the page is primarily for creating an invoice, and a
 * list of every past one would push the form off screen.
 *
 * PDFs open through /api/admin/invoices-generated/[id]/view, an authenticated
 * route that proxies the bytes; the Cloudinary URL is never exposed, because an
 * invoice carries a client's name and what they were charged.
 */

'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';

export interface StoredInvoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  invoiceDate: string;
  orderType: string;
  stateCode: string;
  paymentStatus: string;
  finalAmount: number;
  /** Whether a stored PDF exists. The storage URL never leaves the server. */
  hasDocument: boolean;
  fileName: string;
  formInput: Record<string, unknown>;
  createdAt: string;
}

interface InvoiceListProps {
  /** Reopens an invoice in the form for editing and regeneration. */
  onEdit: (invoice: StoredInvoice) => void;
  /** Bumped by the parent after a generate, to pull the new row in. */
  refreshToken: number;
}

const STATUS_STYLES: Record<string, string> = {
  paid: 'bg-[#d1fae5] text-[#065f46] border-[#a7f3d0]',
  partial: 'bg-[#fef3c7] text-[#92400e] border-[#fde68a]',
  unpaid: 'bg-[#fee2e2] text-[#991b1b] border-[#fecaca]',
};

const ORDER_TYPE_LABELS: Record<string, string> = {
  llc: 'LLC',
  itin: 'ITIN',
  renewal: 'Renewal',
};

export default function InvoiceList({ onEdit, refreshToken }: InvoiceListProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [invoices, setInvoices] = useState<StoredInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Inline filename editing.
  const [editingName, setEditingName] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/invoices-generated', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not load invoices.');
        return;
      }
      setInvoices(data.invoices ?? []);
      setLoaded(true);
    } catch {
      setError('Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetched on first expand, then kept fresh after each generate.
  useEffect(() => {
    if (expanded && !loaded) void load();
  }, [expanded, loaded, load]);

  // A new invoice always lands in the list, and the list opens itself to show
  // it — otherwise generating appears to do nothing until the section is
  // expanded by hand, which reads as "it did not save".
  useEffect(() => {
    if (refreshToken === 0) return;
    setExpanded(true);
    void load();
  }, [refreshToken, load]);

  useEffect(() => {
    if (editingName) nameInputRef.current?.select();
  }, [editingName]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter(
      (i) =>
        i.invoiceNumber.toLowerCase().includes(q) ||
        i.customerName.toLowerCase().includes(q) ||
        i.fileName.toLowerCase().includes(q)
    );
  }, [invoices, query]);

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const allVisibleSelected = filtered.length > 0 && filtered.every((i) => selected.has(i.id));
  const toggleAll = () => {
    const next = new Set(selected);
    if (allVisibleSelected) filtered.forEach((i) => next.delete(i.id));
    else filtered.forEach((i) => next.add(i.id));
    setSelected(next);
  };

  const saveName = async (id: string) => {
    const name = draftName.trim();
    if (!name) {
      setEditingName(null);
      return;
    }
    setBusy(id);
    setError(null);
    try {
      const res = await fetch('/api/admin/invoices-generated', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, fileName: name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not rename.');
        return;
      }
      const withExt = /\.pdf$/i.test(name) ? name : `${name}.pdf`;
      setInvoices((prev) => prev.map((i) => (i.id === id ? { ...i, fileName: withExt } : i)));
      setEditingName(null);
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(null);
    }
  };

  const remove = async (ids: string[], confirmText: string) => {
    if (!confirm(confirmText)) return;
    setBusy(ids.length === 1 ? ids[0] : 'bulk');
    setError(null);
    try {
      const res =
        ids.length === 1
          ? await fetch(`/api/admin/invoices-generated?id=${encodeURIComponent(ids[0])}`, { method: 'DELETE' })
          : await fetch('/api/admin/invoices-generated', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ids }),
            });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not delete.');
        return;
      }
      if (data.warning) setError(data.warning);
      setInvoices((prev) => prev.filter((i) => !ids.includes(i.id)));
      setSelected(new Set());
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
      {/* Collapsed header */}
      <div className="flex flex-wrap items-center gap-3 p-3.5">
        <button
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex items-center gap-2 flex-1 min-w-0 text-left group"
        >
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
          )}
          <FileText className="w-4 h-4 text-[#34088f] flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 group-hover:text-[#34088f] transition">
              Saved invoices
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {loaded ? `${invoices.length} stored` : 'View, edit or delete a past invoice'}
            </p>
          </div>
        </button>

        {expanded && (
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        )}
      </div>

      {expanded && (
        <div className="border-t border-gray-100">
          {error && (
            <div className="flex items-start gap-2 px-3.5 py-2.5 bg-[#fef3c7] border-b border-[#fde68a]">
              <AlertCircle className="w-3.5 h-3.5 text-[#92400e] mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-[#92400e] leading-relaxed">{error}</p>
            </div>
          )}

          {/* Search + bulk actions */}
          <div className="flex flex-wrap items-center gap-2 p-3 border-b border-gray-100">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search invoice number, customer or file name…"
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#34088f]/20 focus:border-[#34088f]"
              />
            </div>

            {selected.size > 0 && (
              <button
                onClick={() =>
                  remove(
                    [...selected],
                    `Delete ${selected.size} invoice${selected.size === 1 ? '' : 's'}?\n\nThe stored PDFs are removed permanently.`
                  )
                }
                disabled={busy === 'bulk'}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold text-[#991b1b] bg-white border border-[#fecaca] rounded-lg hover:bg-red-50 disabled:opacity-40 transition"
              >
                {busy === 'bulk' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                Delete {selected.size}
              </button>
            )}
          </div>

          {loading && !loaded ? (
            <p className="p-8 text-center text-sm text-gray-500">Loading invoices…</p>
          ) : filtered.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-500">
              {invoices.length === 0
                ? 'No invoices saved yet. Generating one stores it here.'
                : `No invoices match “${query}”.`}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="w-10 px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleAll}
                        aria-label="Select all visible invoices"
                        className="w-3.5 h-3.5 accent-[#34088f] cursor-pointer"
                      />
                    </th>
                    {['Invoice', 'Customer', 'File name', 'Amount', 'Status', ''].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv) => {
                    const rowBusy = busy === inv.id;
                    const isEditing = editingName === inv.id;

                    return (
                      <tr key={inv.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition">
                        <td className="px-3 py-2.5">
                          <input
                            type="checkbox"
                            checked={selected.has(inv.id)}
                            onChange={() => toggleSelect(inv.id)}
                            aria-label={`Select ${inv.invoiceNumber}`}
                            className="w-3.5 h-3.5 accent-[#34088f] cursor-pointer"
                          />
                        </td>

                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <div className="text-xs font-semibold text-gray-900 tabular-nums">
                            {inv.invoiceNumber}
                          </div>
                          <div className="text-[11px] text-gray-400">
                            {ORDER_TYPE_LABELS[inv.orderType] ?? inv.orderType} · {inv.stateCode}
                          </div>
                        </td>

                        <td className="px-3 py-2.5 text-xs text-gray-700 max-w-[180px] truncate" title={inv.customerName}>
                          {inv.customerName}
                        </td>

                        {/* Click the file name to rename it in place. */}
                        <td className="px-3 py-2.5 max-w-[280px]">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                ref={nameInputRef}
                                value={draftName}
                                onChange={(e) => setDraftName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') void saveName(inv.id);
                                  if (e.key === 'Escape') setEditingName(null);
                                }}
                                className="flex-1 px-2 py-1 text-xs border border-[#34088f] rounded focus:outline-none focus:ring-2 focus:ring-[#34088f]/20"
                              />
                              <button
                                onClick={() => void saveName(inv.id)}
                                disabled={rowBusy}
                                aria-label="Save file name"
                                title="Save"
                                className="p-1 text-[#065f46] hover:bg-[#d1fae5] rounded disabled:opacity-40"
                              >
                                {rowBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setEditingName(inv.id); setDraftName(inv.fileName); }}
                              className="group flex items-start gap-1.5 text-left w-full"
                              title="Click to rename"
                            >
                              <span className="text-xs text-gray-600 truncate">{inv.fileName}</span>
                              <Pencil className="w-3 h-3 mt-0.5 text-gray-300 group-hover:text-[#34088f] flex-shrink-0" />
                            </button>
                          )}
                        </td>

                        <td className="px-3 py-2.5 text-xs font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                          ${inv.finalAmount.toFixed(2)}
                        </td>

                        <td className="px-3 py-2.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded border capitalize ${
                              STATUS_STYLES[inv.paymentStatus] ?? 'bg-gray-50 text-gray-600 border-gray-200'
                            }`}
                          >
                            {inv.paymentStatus.replace(/_/g, ' ')}
                          </span>
                        </td>

                        <td className="px-3 py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            {inv.hasDocument && (
                              <>
                                <a
                                  href={`/api/admin/invoices-generated/${inv.id}/view`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="View"
                                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-[#34088f] hover:bg-[#f5f2fe] rounded-lg transition"
                                >
                                  View
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                                <a
                                  href={`/api/admin/invoices-generated/${inv.id}/view?download=1`}
                                  title="Download"
                                  className="p-1.5 text-gray-400 hover:text-[#34088f] hover:bg-[#f5f2fe] rounded-lg transition"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                              </>
                            )}
                            <button
                              onClick={() => onEdit(inv)}
                              title="Open in the form to edit and regenerate"
                              aria-label={`Edit ${inv.invoiceNumber}`}
                              className="p-1.5 text-gray-400 hover:text-[#34088f] hover:bg-[#f5f2fe] rounded-lg transition"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() =>
                                remove(
                                  [inv.id],
                                  `Delete invoice ${inv.invoiceNumber} for ${inv.customerName}?\n\nThe stored PDF is removed permanently.`
                                )
                              }
                              disabled={rowBusy}
                              aria-label={`Delete ${inv.invoiceNumber}`}
                              className="p-1.5 text-gray-400 hover:text-[#991b1b] hover:bg-red-50 rounded-lg disabled:opacity-40 transition"
                            >
                              {rowBusy && !isEditing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
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
      )}
    </div>
  );
}
