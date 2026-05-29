/**
 * @file src/app/admin/(dashboard)/llc-registrations/_components/LlcEmptyState.tsx
 * @description Beautiful Empty State container handling zero order and zero search result states.
 */

import React from 'react';
import Link from 'next/link';
import { LlcListFilters } from '@/types/admin';

interface LlcEmptyStateProps {
  filters: LlcListFilters;
  isTotalZero: boolean;
}

export default function LlcEmptyState({
  filters,
  isTotalZero,
}: LlcEmptyStateProps): React.JSX.Element {
  const isSearchOrFilterActive = filters.q !== '' || filters.status !== 'all' || filters.dateFilter !== 'all';

  if (isTotalZero && !isSearchOrFilterActive) {
    // Variant A: No orders at all
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 bg-white border border-[#e5e7eb] rounded-[0.125rem] text-center">
        <div className="w-16 h-16 bg-[#f3f4f6] text-[#34088f] flex items-center justify-center rounded-[0.125rem] mb-4">
          {/* Clipboard SVG */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="w-8 h-8"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h3 className="font-manrope text-lg font-bold text-[#111111] mb-1">
          No LLC Registrations Yet
        </h3>
        <p className="text-sm text-[#6b7280] font-inter max-w-sm">
          When clients submit LLC registration orders, they will appear here.
        </p>
      </div>
    );
  }

  // Variant B: Active search or filter returned no results
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 bg-white border border-[#e5e7eb] rounded-[0.125rem] text-center">
      <div className="w-16 h-16 bg-[#fff7ed] text-[#c2410c] flex items-center justify-center rounded-[0.125rem] mb-4">
        {/* Search SVG */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="w-8 h-8"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z"
          />
        </svg>
      </div>
      <h3 className="font-manrope text-lg font-bold text-[#111111] mb-1">
        No orders found
      </h3>
      <p className="text-sm text-[#6b7280] font-inter max-w-sm mb-5">
        Try adjusting your search or filters.
      </p>
      <Link
        href="/admin/llc-registrations"
        className="inline-flex items-center px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-[#34088f] hover:bg-[#250566] transition-colors rounded-[0.125rem]"
      >
        Clear all filters
      </Link>
    </div>
  );
}
