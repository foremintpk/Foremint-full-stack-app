/**
 * @file src/app/admin/(dashboard)/llc-registrations/_components/LlcListControls.tsx
 * @description Interactive controls panel housing a debounced search input, date presets, sorting triggers, and pagesize dropdowns.
 */

'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LlcListFilters } from '@/types/admin';
import { DATE_RANGES } from '@/lib/admin/dateRanges';

interface LlcListControlsProps {
  filters: LlcListFilters;
}

export default function LlcListControls({
  filters,
}: LlcListControlsProps): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = useState(filters.q);
  const [isDebouncing, setIsDebouncing] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Sync state if q filter in URL updates externally
  useEffect(() => {
    setSearchTerm(filters.q);
  }, [filters.q]);

  // Search input debouncer (350ms)
  useEffect(() => {
    if (searchTerm === filters.q) {
      setIsDebouncing(false);
      return;
    }

    setIsDebouncing(true);
    const handler = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (searchTerm.trim()) {
        params.set('q', searchTerm.trim());
      } else {
        params.delete('q');
      }
      params.set('page', '1'); // reset page on search update
      startTransition(() => {
        router.push(`/admin/llc-registrations?${params.toString()}`);
        setIsDebouncing(false);
      });
    }, 350);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, filters.q, router]);

  // Load pagesize preference from sessionStorage on client mount
  useEffect(() => {
    const savedSize = sessionStorage.getItem('fm_admin_llc_pagesize');
    if (savedSize && savedSize !== String(filters.pageSize) && !filters.q) {
      const params = new URLSearchParams(window.location.search);
      params.set('pageSize', savedSize);
      params.set('page', '1');
      startTransition(() => {
        router.push(`/admin/llc-registrations?${params.toString()}`);
      });
    }
  }, [filters.pageSize, filters.q, router]);

  const handleDateChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const value = e.target.value;
    const params = new URLSearchParams(window.location.search);
    if (value !== 'all') {
      params.set('filter', value);
    } else {
      params.delete('filter');
    }
    params.set('page', '1'); // reset to page 1
    startTransition(() => {
      router.push(`/admin/llc-registrations?${params.toString()}`);
    });
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const value = e.target.value;
    const params = new URLSearchParams(window.location.search);

    if (value === 'newest') {
      params.set('sort', 'created_at');
      params.set('dir', 'desc');
    } else if (value === 'oldest') {
      params.set('sort', 'created_at');
      params.set('dir', 'asc');
    } else if (value === 'highest') {
      params.set('sort', 'grand_total');
      params.set('dir', 'desc');
    } else if (value === 'number') {
      params.set('sort', 'order_number');
      params.set('dir', 'asc');
    }

    // Preserve the current page
    startTransition(() => {
      router.push(`/admin/llc-registrations?${params.toString()}`);
    });
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const value = e.target.value;
    sessionStorage.setItem('fm_admin_llc_pagesize', value);

    const params = new URLSearchParams(window.location.search);
    params.set('pageSize', value);
    params.set('page', '1'); // reset to page 1
    startTransition(() => {
      router.push(`/admin/llc-registrations?${params.toString()}`);
    });
  };

  // Determine active sort dropdown key
  let currentSortKey = 'newest';
  if (filters.sort === 'created_at' && filters.dir === 'asc') currentSortKey = 'oldest';
  if (filters.sort === 'grand_total' && filters.dir === 'desc') currentSortKey = 'highest';
  if (filters.sort === 'order_number' && filters.dir === 'asc') currentSortKey = 'number';

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between w-full">
      {/* Search Input Box */}
      <div className="relative flex-1">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {/* Search Icon */}
          <svg
            className="h-4 w-4 text-[#9ca3af]"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          type="text"
          role="searchbox"
          aria-label="Search orders"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={isPending && !isDebouncing}
          placeholder="Search by client name or LLC name..."
          className="block w-full h-10 pl-10 pr-10 border border-[#e5e7eb] rounded-full bg-white text-sm text-[#111111] placeholder-[#9ca3af] outline-none focus:border-[#34088f] transition-all font-inter disabled:opacity-60 disabled:bg-gray-50"
        />
        {/* Loading Spinner or Clear Action Button */}
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
          {isDebouncing ? (
            <svg
              className="animate-spin h-4 w-4 text-[#34088f]"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            (searchTerm || isPending) && (
              <button
                onClick={() => setSearchTerm('')}
                aria-label="Clear search"
                disabled={isPending}
                className="text-[#9ca3af] hover:text-[#111111] transition-colors disabled:opacity-50"
              >
                <svg
                  className="h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )
          )}
        </div>
      </div>

      {/* Dynamic Filters Dropdowns Container */}
      <div className="flex flex-wrap items-center gap-3 shrink-0">
        {/* Date Filter Preset Dropdown */}
        <div className="relative flex flex-col min-w-[130px]">
          <select
            id="controls-date-filter"
            aria-label="Filter by date range"
            value={filters.dateFilter}
            onChange={handleDateChange}
            disabled={isPending}
            className="appearance-none w-full h-10 pl-4 pr-10 bg-white border border-[#e5e7eb] rounded-full text-xs font-semibold text-[#374151] cursor-pointer outline-none focus:border-[#34088f] transition-all font-inter disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="all">All Time</option>
            {DATE_RANGES.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
            <svg className="h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        </div>

        {/* Sorting Dropdown */}
        <div className="relative flex flex-col min-w-[130px]">
          <select
            id="controls-sort-filter"
            aria-label="Sort orders"
            value={currentSortKey}
            onChange={handleSortChange}
            disabled={isPending}
            className="appearance-none w-full h-10 pl-4 pr-10 bg-white border border-[#e5e7eb] rounded-full text-xs font-semibold text-[#374151] cursor-pointer outline-none focus:border-[#34088f] transition-all font-inter disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="highest">Highest Amount</option>
            <option value="number">Order Number</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
            <svg className="h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        </div>

        {/* Page Size Selector */}
        <div className="relative flex flex-col min-w-[90px]">
          <select
            id="controls-pagesize-filter"
            aria-label="Select page size"
            value={String(filters.pageSize)}
            onChange={handlePageSizeChange}
            disabled={isPending}
            className="appearance-none w-full h-10 pl-4 pr-10 bg-white border border-[#e5e7eb] rounded-full text-xs font-semibold text-[#374151] cursor-pointer outline-none focus:border-[#34088f] transition-all font-inter disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="10">10 / page</option>
            <option value="25">25 / page</option>
            <option value="50">50 / page</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
            <svg className="h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
