'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface ExpenseDateFilterProps {
  activeDateRange: string;
}

const DATE_OPTIONS = [
  { label: 'All Time', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: '7 Days', value: '7d' },
  { label: '14 Days', value: '14d' },
  { label: '30 Days', value: '30d' },
  { label: '60 Days', value: '60d' },
  { label: '90 Days', value: '90d' },
];

export function ExpenseDateFilter({ activeDateRange }: ExpenseDateFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSelect = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('dateRange', value);
    params.set('page', '1'); // reset page
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {DATE_OPTIONS.map((opt) => {
        const isActive = activeDateRange === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => handleSelect(opt.value)}
            className={`whitespace-nowrap px-4 py-1.5 text-xs font-bold transition-all shrink-0 ${
              isActive
                ? 'bg-[#34088f] text-white rounded-full shadow-sm'
                : 'bg-white text-gray-600 border border-[#e0d9f7] rounded-full hover:bg-gray-50'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
