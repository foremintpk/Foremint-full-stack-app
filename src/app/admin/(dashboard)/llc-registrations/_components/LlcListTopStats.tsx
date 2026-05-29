/**
 * @file src/app/admin/(dashboard)/llc-registrations/_components/LlcListTopStats.tsx
 * @description Renders the 4 top-level clickable stat filter pills as full server-rendered Next.js Links.
 */

import React from 'react';
import Link from 'next/link';
import { LlcTopStats, LlcOrderStatus, LlcListFilters } from '@/types/admin';

interface LlcListTopStatsProps {
  stats: LlcTopStats;
  activeStatus: LlcOrderStatus | 'all';
  filters: LlcListFilters;
}

export default function LlcListTopStats({
  stats,
  activeStatus,
  filters,
}: LlcListTopStatsProps): React.JSX.Element {
  
  const buildStatusUrl = (newStatus: LlcOrderStatus | 'all'): string => {
    const params = new URLSearchParams();
    if (newStatus !== 'all') {
      params.set('status', newStatus);
    }
    if (filters.q) params.set('q', filters.q);
    if (filters.dateFilter !== 'all') params.set('filter', filters.dateFilter);
    if (filters.pageSize !== 25) params.set('pageSize', String(filters.pageSize));
    if (filters.sort !== 'created_at') params.set('sort', filters.sort);
    if (filters.dir !== 'desc') params.set('dir', filters.dir);
    params.set('page', '1'); // resetting page to 1
    return `/admin/llc-registrations?${params.toString()}`;
  };

  const pills = [
    { label: 'All', value: stats.total, key: 'all' as const },
    { label: 'Pending', value: stats.pending, key: 'pending' as const },
    { label: 'Processing', value: stats.processing, key: 'processing' as const },
    { label: 'Formed', value: stats.formed, key: 'formed' as const },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Filter by order status"
      className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible"
    >
      {pills.map((pill) => {
        const isActive = activeStatus === pill.key;
        return (
          <Link
            key={pill.key}
            href={buildStatusUrl(pill.key) as any}
            role="radio"
            aria-checked={isActive}
            className={`flex items-center justify-between min-w-[120px] px-5 py-2.5 border rounded-full transition-all duration-200 shrink-0 ${
              isActive
                ? 'bg-[#34088f] border-[#34088f] text-white shadow-sm'
                : 'bg-white border-[#e5e7eb] hover:bg-[#fafafa] text-[#111111]'
            }`}
          >
            <span
              className={`text-[10px] font-bold uppercase tracking-wide transition-colors ${
                isActive ? 'text-[#e2d9f3]' : 'text-[#6b7280]'
              }`}
            >
              {pill.label}
            </span>
            <span className="text-sm font-bold ml-3 font-manrope">
              {pill.value}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
