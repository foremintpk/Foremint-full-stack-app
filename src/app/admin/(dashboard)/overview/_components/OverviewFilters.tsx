/**
 * @file src/app/admin/(dashboard)/overview/_components/OverviewFilters.tsx
 * @description Sleek, accessible date range dropdown that persists choice state and drives URL transitions.
 * 
 * 1. Server vs Client choice rationale: Client Component ("use client") to persist selections in sessionStorage and trigger router.push().
 * 2. Caching layer: Layer 4 - sessionStorage caching for filter key preferences.
 * 3. RBAC: N/A.
 * 4. Revalidation / Cache Busting: Triggers full layout re-renders.
 */

'use client';

import React, { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DateRangeFilter } from '@/types/admin';

interface SerializableDateRange {
  label: string;
  key: DateRangeFilter;
}

interface OverviewFiltersProps {
  activeFilter: DateRangeFilter;
  filters: SerializableDateRange[];
}

export function OverviewFilters({
  activeFilter,
  filters,
}: OverviewFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Restore the persistent filter choice state from sessionStorage on mount
  useEffect(() => {
    try {
      const persisted = window.sessionStorage.getItem('fm_admin_overview_filter') as DateRangeFilter | null;
      const currentParam = searchParams.get('filter') as DateRangeFilter | null;

      if (persisted && persisted !== currentParam && filters.some((f) => f.key === persisted)) {
        router.push(`/admin/overview?filter=${persisted}` as any);
      }
    } catch (err) {
      console.error('Error reading sessionStorage key for overview filter:', err);
    }
  }, [searchParams, router, filters]);

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const key = e.target.value as DateRangeFilter;
    try {
      window.sessionStorage.setItem('fm_admin_overview_filter', key);
    } catch (err) {
      console.error('Error storing filter selection in sessionStorage:', err);
    }
    router.push(`/admin/overview?filter=${key}` as any);
  };

  return (
    <div className="relative inline-block min-w-[160px]">
      <select
        value={activeFilter}
        onChange={handleSelect}
        aria-label="Filter overview by date range"
        className="appearance-none w-full bg-white border border-[#e0d9f7] rounded-full py-2.5 pl-5 pr-10 text-sm font-bold font-inter text-[#34088f] shadow-sm hover:border-[#c4b5fd] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#34088f] focus:ring-opacity-50 transition-all cursor-pointer"
      >
        {filters.map((filter) => (
          <option key={filter.key} value={filter.key} className="font-semibold text-gray-700">
            {filter.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
        <svg
          className="h-4 w-4 text-[#34088f]"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    </div>
  );
}
