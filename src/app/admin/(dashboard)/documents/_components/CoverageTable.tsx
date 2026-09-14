/**
 * @file src/app/admin/(dashboard)/documents/_components/CoverageTable.tsx
 * @description Per-order document coverage — which orders are still missing
 * which documents.
 *
 * Defaults to showing only orders that are actually missing something, since
 * that is the working list. A pending order has no Articles yet, so the "active"
 * filter (formed / EIN-pending) is on by default too.
 */

'use client';

import React, { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Minus, Search } from 'lucide-react';
import type { OrderCoverage } from '@/lib/services/documents/orderBook';

interface CoverageTableProps {
  rows: OrderCoverage[];
  stats: { totalOrders: number; activeOrders: number; missing: Record<string, number> };
}

const COLUMNS = [
  { key: 'articles_of_organization', label: 'Articles' },
  { key: 'operating_agreement', label: 'Operating Agr.' },
  { key: 'ein_letter', label: 'EIN Letter' },
] as const;

export default function CoverageTable({ rows, stats }: CoverageTableProps): React.JSX.Element {
  const [query, setQuery] = useState('');
  const [onlyMissing, setOnlyMissing] = useState(true);
  const [onlyActive, setOnlyActive] = useState(true);
  const [expanded, setExpanded] = useState(false);

  /** Rows shown before "See all" is pressed. */
  const PREVIEW_COUNT = 3;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (onlyActive && r.status !== 'formed' && r.status !== 'ein_pending') return false;
      if (onlyMissing && COLUMNS.every((c) => r.has[c.key])) return false;
      if (!q) return true;
      return (
        r.orderNumber.toLowerCase().includes(q) || r.companyName.toLowerCase().includes(q)
      );
    });
  }, [rows, query, onlyMissing, onlyActive]);

  const isCollapsed = !expanded && !query.trim() && filtered.length > PREVIEW_COUNT;
  const visible = isCollapsed ? filtered.slice(0, PREVIEW_COUNT) : filtered;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-sm font-bold text-gray-900 font-manrope">Coverage</h2>
        <p className="text-xs text-gray-500">
          Across {stats.activeOrders} formed / EIN-pending orders:{' '}
          {COLUMNS.map((c, i) => (
            <span key={c.key}>
              {i > 0 && ' · '}
              <span className={stats.missing[c.key] > 0 ? 'font-semibold text-[#9a3412]' : ''}>
                {stats.missing[c.key] ?? 0} missing {c.label.toLowerCase()}
              </span>
            </span>
          ))}
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-3 border-b border-gray-100">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search order or company…"
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#34088f]/20 focus:border-[#34088f]"
            />
          </div>

          <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyMissing}
              onChange={(e) => setOnlyMissing(e.target.checked)}
              className="w-3.5 h-3.5 accent-[#34088f] cursor-pointer"
            />
            Only orders missing something
          </label>

          <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyActive}
              onChange={(e) => setOnlyActive(e.target.checked)}
              className="w-3.5 h-3.5 accent-[#34088f] cursor-pointer"
            />
            Formed / EIN-pending only
          </label>
        </div>

        {filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-500">
            {onlyMissing ? 'Every matching order has all three documents.' : 'No orders match.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Order</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Company</th>
                  {COLUMNS.map((c) => (
                    <th key={c.key} className="px-3 py-2.5 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {c.label}
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Other</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.orderId} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition">
                    <td className="px-3 py-2 text-xs font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                      {r.orderNumber}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600 max-w-[240px] truncate" title={r.companyName}>
                      {r.companyName || <span className="text-gray-400">—</span>}
                    </td>
                    {COLUMNS.map((c) => (
                      <td key={c.key} className="px-3 py-2 text-center">
                        {r.has[c.key] ? (
                          <Check className="w-3.5 h-3.5 text-[#065f46] inline" aria-label="present" />
                        ) : (
                          <Minus className="w-3.5 h-3.5 text-[#d1d5db] inline" aria-label="missing" />
                        )}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center text-xs text-gray-500 tabular-nums">
                      {r.additionalCount || <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > PREVIEW_COUNT && !query.trim() && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center justify-center gap-1.5 w-full py-2.5 text-xs font-semibold text-[#34088f] border-t border-gray-100 hover:bg-[#f5f2fe] transition"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                See all {filtered.length} orders
              </>
            )}
          </button>
        )}
      </div>
    </section>
  );
}
