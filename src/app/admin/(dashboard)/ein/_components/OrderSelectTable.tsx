/**
 * @file src/app/admin/(dashboard)/ein/_components/OrderSelectTable.tsx
 * @description Searchable multi-select table of EIN-pending orders.
 *
 * Shows the attempt each order would carry BEFORE anything runs, so an operator
 * can see that an order is at the cap — or missing its Articles — rather than
 * discovering it mid-batch.
 */

'use client';

import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, FileWarning, Search } from 'lucide-react';
import type { Ss4OrderRow } from '@/lib/services/ss4/types';

interface OrderSelectTableProps {
  orders: Ss4OrderRow[];
  selected: Set<string>;
  onSelectionChange: (next: Set<string>) => void;
  disabled: boolean;
}

export default function OrderSelectTable({
  orders,
  selected,
  onSelectionChange,
  disabled,
}: OrderSelectTableProps): React.JSX.Element {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.llcName.toLowerCase().includes(q) ||
        o.responsibleName.toLowerCase().includes(q)
    );
  }, [orders, query]);

  const toggle = (orderNumber: string) => {
    const next = new Set(selected);
    if (next.has(orderNumber)) next.delete(orderNumber);
    else next.add(orderNumber);
    onSelectionChange(next);
  };

  /** How many rows show before "See all" is pressed. */
  const PREVIEW_COUNT = 3;

  // Searching implies you are looking for something specific, so a query shows
  // every match rather than hiding results behind the toggle.
  const isCollapsed = !expanded && !query.trim() && filtered.length > PREVIEW_COUNT;
  const visible = isCollapsed ? filtered.slice(0, PREVIEW_COUNT) : filtered;

  // "Select all" acts on what is visible, so a filtered view cannot silently
  // queue orders the operator cannot see.
  const allVisibleSelected =
    visible.length > 0 && visible.every((o) => selected.has(o.orderNumber));

  const toggleAll = () => {
    const next = new Set(selected);
    if (allVisibleSelected) visible.forEach((o) => next.delete(o.orderNumber));
    else visible.forEach((o) => next.add(o.orderNumber));
    onSelectionChange(next);
  };

  if (orders.length === 0) {
    return (
      <div className="p-8 text-center bg-white border border-gray-200 rounded-xl">
        <p className="text-sm text-gray-500">No orders are awaiting an EIN right now.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="p-3 border-b border-gray-100">
        <div className="relative max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search order, LLC or member…"
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#34088f]/20 focus:border-[#34088f]"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="w-10 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleAll}
                  disabled={disabled}
                  aria-label="Select all visible orders"
                  className="w-3.5 h-3.5 accent-[#34088f] cursor-pointer"
                />
              </th>
              {['Order', 'LLC', 'Responsible party', 'Members', 'Next attempt', 'Documents'].map((h) => (
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
            {visible.map((o) => {
              const isSelected = selected.has(o.orderNumber);
              return (
                <tr
                  key={o.orderNumber}
                  onClick={() => !disabled && toggle(o.orderNumber)}
                  className={`border-b border-gray-50 last:border-0 cursor-pointer transition ${
                    isSelected ? 'bg-[#f5f2fe]' : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(o.orderNumber)}
                      disabled={disabled}
                      aria-label={`Select ${o.orderNumber}`}
                      className="w-3.5 h-3.5 accent-[#34088f] cursor-pointer"
                    />
                  </td>
                  <td className="px-3 py-2.5 text-xs font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                    {o.orderNumber}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-700 max-w-[220px] truncate" title={o.llcName}>
                    {o.llcName || <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-600 max-w-[180px] truncate" title={o.responsibleName}>
                    {o.responsibleName || <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-600 tabular-nums">{o.members}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded border ${
                        o.atCap
                          ? 'bg-[#ffedd5] text-[#9a3412] border-[#fed7aa]'
                          : 'bg-gray-50 text-gray-600 border-gray-200'
                      }`}
                      title={
                        o.atCap
                          ? 'At the 6-attempt cap — further runs reproduce attempt 6 exactly.'
                          : undefined
                      }
                    >
                      {o.atCap ? '6 (capped)' : o.nextAttempt}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {o.articlesUrl ? (
                      <span className="text-[11px] text-gray-500">
                        Articles{o.identityUrl ? ' + ID' : ''}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#991b1b]">
                        <FileWarning className="w-3 h-3" />
                        No Articles
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

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

      {filtered.length === 0 && (
        <p className="p-6 text-center text-xs text-gray-500">No orders match “{query}”.</p>
      )}
    </div>
  );
}
