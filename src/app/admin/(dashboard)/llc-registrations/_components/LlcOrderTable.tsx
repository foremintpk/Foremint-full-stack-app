'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { LlcOrderRow } from '@/types/admin';
import LlcOrderRowComponent from './LlcOrderRow';
import LlcOrderCardComponent from './LlcOrderCard';

interface LlcOrderTableProps {
  orders: LlcOrderRow[];
}

/** Rows shown before "See all" is pressed. */
const PREVIEW_COUNT = 5;

export default function LlcOrderTable({ orders }: LlcOrderTableProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);

  // Collapses within the current page only; the pagination below still governs
  // how many orders were fetched.
  const isCollapsed = !expanded && orders.length > PREVIEW_COUNT;
  const visible = isCollapsed ? orders.slice(0, PREVIEW_COUNT) : orders;

  return (
    <div className="w-full space-y-1.5">
      {/* Desktop & Tablet Table (>=768px) */}
      <div className="hidden md:block w-full">
        {/* Capsule Header Row */}
        <div className="grid grid-cols-[1fr_1.2fr_1.4fr_0.9fr_0.9fr_0.9fr_auto] gap-0 px-6 py-2.5 bg-[#f4f0fe] rounded-2xl mb-2">
          <span className="text-[11px] font-bold text-[#6b7280] uppercase tracking-wider font-inter">Order</span>
          <span className="text-[11px] font-bold text-[#6b7280] uppercase tracking-wider font-inter">Client</span>
          <span className="text-[11px] font-bold text-[#6b7280] uppercase tracking-wider font-inter">LLC Name</span>
          <span className="text-[11px] font-bold text-[#6b7280] uppercase tracking-wider font-inter">Status</span>
          <span className="text-[11px] font-bold text-[#6b7280] uppercase tracking-wider font-inter">Date</span>
          <span className="text-[11px] font-bold text-[#6b7280] uppercase tracking-wider font-inter text-right">Pending Amt</span>
          <span className="w-11" />
        </div>

        {/* Data rows */}
        <div role="table" aria-label="LLC registrations list" className="w-full space-y-1.5">
          <div role="rowgroup" className="space-y-1.5">
            {visible.map((order) => (
              <LlcOrderRowComponent key={order.id} order={order} />
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Stacked Card View (<768px) */}
      <div className="flex flex-col gap-3 md:hidden">
        {visible.map((order) => (
          <LlcOrderCardComponent key={order.id} order={order} />
        ))}
      </div>

      {orders.length > PREVIEW_COUNT && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center justify-center gap-1.5 w-full py-2.5 text-xs font-semibold text-[#34088f] bg-white border border-gray-200 rounded-[0.125rem] hover:bg-[#f5f2fe] transition font-inter"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              See all {orders.length} on this page
            </>
          )}
        </button>
      )}
    </div>
  );
}
