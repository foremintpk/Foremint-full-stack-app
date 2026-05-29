/**
 * @file src/app/admin/packages/_components/PackageFilterTabs.tsx
 * @description Client Component to select filter tabs with smooth transitions.
 */

'use client';

import React, { useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

interface PackageFilterTabsProps {
  counts: {
    all: number;
    published: number;
    draft: number;
  };
  activeStatus: string;
}

export function PackageFilterTabs({
  counts,
  activeStatus,
}: PackageFilterTabsProps): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handleTabClick = (status: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (status === 'all') {
        params.delete('status');
      } else {
        params.set('status', status);
      }
      router.push(`${pathname}?${params.toString()}` as any);
    });
  };

  const tabs = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'published', label: 'Published', count: counts.published },
    { key: 'draft', label: 'Draft', count: counts.draft },
  ];

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {tabs.map((tab) => {
        const isActive = activeStatus === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => handleTabClick(tab.key)}
            disabled={isPending}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all focus:outline-none disabled:opacity-50 ${
              isActive
                ? 'bg-[#34088f] text-white shadow-sm'
                : 'border border-[#e0d9f7] bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab.label}
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
      {isPending && (
        <span className="text-xs text-gray-400 ml-2 flex items-center gap-1.5">
          <svg
            className="h-3 w-3 animate-spin text-gray-400"
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
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Updating...
        </span>
      )}
    </div>
  );
}
