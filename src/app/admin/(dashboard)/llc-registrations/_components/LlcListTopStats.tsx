'use client';

import React from 'react';
import { LlcTopStats, LlcOrderStatus, LlcListFilters } from '@/types/admin';
import { useLlcNavigation } from '@/context/llc-navigation-context';
import { ORDER_STATUS_OPTIONS } from '@/lib/orders/orderStatus';

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
  const { navigate, isPending } = useLlcNavigation();

  const buildStatusUrl = (newStatus: LlcOrderStatus | 'all'): string => {
    const params = new URLSearchParams();
    if (newStatus !== 'all') params.set('status', newStatus);
    if (filters.q) params.set('q', filters.q);
    if (filters.dateFilter !== 'all') params.set('filter', filters.dateFilter);
    if (filters.pageSize !== 25) params.set('pageSize', String(filters.pageSize));
    if (filters.sort !== 'created_at') params.set('sort', filters.sort);
    if (filters.dir !== 'desc') params.set('dir', filters.dir);
    params.set('page', '1');
    return `/admin/llc-registrations?${params.toString()}`;
  };

  // "All" first, then every selectable status in the shared presentation order.
  const pills: { label: string; value: number; key: LlcOrderStatus | 'all' }[] = [
    { label: 'All', value: stats.total, key: 'all' },
    ...ORDER_STATUS_OPTIONS.map((opt) => ({
      label: opt.label,
      value: stats.byStatus[opt.value as keyof typeof stats.byStatus] ?? 0,
      key: opt.value,
    })),
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Filter by order status"
      className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible sm:flex-wrap"
    >
      {pills.map((pill) => {
        const isActive = activeStatus === pill.key;
        return (
          <button
            key={pill.key}
            role="radio"
            aria-checked={isActive}
            disabled={isPending}
            onClick={() => navigate(buildStatusUrl(pill.key))}
            className={`flex items-center justify-between min-w-[120px] px-4 py-2.5 border rounded-full transition-all duration-200 shrink-0 disabled:opacity-70 disabled:cursor-not-allowed ${
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
            <span className="text-sm font-bold ml-3 font-manrope">{pill.value}</span>
          </button>
        );
      })}
    </div>
  );
}
