/**
 * @file OrderMultiSelect.tsx
 * @description Searchable multi-select for assigning LLC orders to a B2B customer.
 */

'use client';

import React, { useMemo, useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import { AssignableOrder } from '@/types/admin';

interface OrderMultiSelectProps {
  orders: AssignableOrder[];
  selected: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

export function OrderMultiSelect({ orders, selected, onChange, disabled }: OrderMultiSelectProps) {
  const [query, setQuery] = useState('');

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) =>
      `${o.orderNumber} ${o.llcName} ${o.ownerName ?? ''} ${o.ownerEmail ?? ''}`
        .toLowerCase()
        .includes(q)
    );
  }, [orders, query]);

  const toggle = (id: string) => {
    if (disabled) return;
    if (selectedSet.has(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const selectedOrders = orders.filter((o) => selectedSet.has(o.id));

  return (
    <div className="space-y-2">
      {/* Selected chips */}
      {selectedOrders.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedOrders.map((o) => (
            <span
              key={o.id}
              className="inline-flex items-center gap-1 bg-[#f4f0fe] text-[#34088f] border border-[#e0d9f7] rounded-full pl-2.5 pr-1 py-0.5 text-[11px] font-semibold"
            >
              {o.orderNumber} — {o.llcName}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => toggle(o.id)}
                  className="hover:bg-[#34088f]/10 rounded-full p-0.5"
                  aria-label={`Remove ${o.orderNumber}`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={disabled}
          placeholder="Search orders by number, LLC, or owner..."
          className="block w-full h-10 pl-10 pr-4 border border-[#e0d9f7] rounded-full text-sm text-[#111111] placeholder-[#9ca3af] outline-none focus:border-[#34088f] focus:ring-2 focus:ring-[#34088f]/20 transition-all"
        />
      </div>

      {/* Options list */}
      <div className="max-h-52 overflow-y-auto rounded-xl border border-[#e0d9f7] divide-y divide-gray-100">
        {filtered.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-gray-400 font-semibold">
            No matching LLC orders.
          </p>
        ) : (
          filtered.map((o) => {
            const isSel = selectedSet.has(o.id);
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => toggle(o.id)}
                disabled={disabled}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                  isSel ? 'bg-[#f4f0fe]' : 'hover:bg-gray-50'
                }`}
              >
                <span
                  className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${
                    isSel ? 'bg-[#34088f] border-[#34088f]' : 'border-gray-300'
                  }`}
                >
                  {isSel && <Check className="w-3 h-3 text-white" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold text-gray-900 truncate">
                    {o.orderNumber} — {o.llcName}
                  </span>
                  <span className="block text-[11px] text-gray-500 truncate">
                    {o.ownerName || 'Unknown owner'}
                    {o.ownerEmail ? ` · ${o.ownerEmail}` : ''}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>
      <p className="text-[11px] text-gray-400 font-semibold px-1">
        {selected.length} order{selected.length === 1 ? '' : 's'} selected
      </p>
    </div>
  );
}
