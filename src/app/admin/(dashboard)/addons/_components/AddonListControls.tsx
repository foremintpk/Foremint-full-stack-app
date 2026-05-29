'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Loader2 } from 'lucide-react';

interface AddonListControlsProps {
  defaultSearch: string;
  defaultStatus: string;
}

export function AddonListControls({ defaultSearch, defaultStatus }: AddonListControlsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [searchVal, setSearchVal] = useState(defaultSearch);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchVal.trim() !== defaultSearch) {
        updateQuery({ search: searchVal.trim() || undefined });
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchVal, defaultSearch]);

  const updateQuery = (updates: Record<string, string | undefined>) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, val]) => {
        if (val === undefined || val === 'all') {
          params.delete(key);
        } else {
          params.set(key, val);
        }
      });
      router.push(`/admin/addons?${params.toString()}` as any);
    });
  };

  return (
    <div className={`flex flex-col sm:flex-row gap-3 items-center transition-opacity duration-150 ${isPending ? 'opacity-60' : 'opacity-100'}`}>
      {/* Search Input */}
      <div className="relative w-full sm:w-64">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#34088f]" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </div>
        <input
          type="text"
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
          placeholder="Search addons..."
          className="block w-full h-10 pl-10 pr-4 bg-white border border-[#e0d9f7] rounded-full text-sm text-[#111111] placeholder-[#9ca3af] outline-none focus:border-[#34088f] focus:ring-2 focus:ring-[#34088f]/20 transition-all font-inter"
        />
      </div>

      {/* Status Filter */}
      <div className="relative w-full sm:w-auto">
        <select
          value={defaultStatus}
          onChange={(e) => updateQuery({ status: e.target.value })}
          className="block w-full sm:w-40 appearance-none h-10 pl-4 pr-10 bg-white border border-[#e0d9f7] rounded-full text-sm font-medium text-gray-700 cursor-pointer outline-none focus:border-[#34088f] focus:ring-2 focus:ring-[#34088f]/20 transition-all font-inter"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <svg className="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
    </div>
  );
}
