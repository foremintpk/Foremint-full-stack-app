'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, ChevronDown } from 'lucide-react';
import { ExpenseCategory } from '@/types/admin';

interface ExpenseListControlsProps {
  defaultSearch: string;
  defaultCategoryId: string;
  categories: ExpenseCategory[];
}

export function ExpenseListControls({
  defaultSearch,
  defaultCategoryId,
  categories,
}: ExpenseListControlsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(defaultSearch);

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (searchValue) {
        params.set('search', searchValue);
      } else {
        params.delete('search');
      }
      params.set('page', '1');
      router.push(`?${params.toString()}`);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue, router, searchParams]);

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('categoryId', e.target.value);
    params.set('page', '1');
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 w-full font-inter select-text">
      {/* Search */}
      <div className="relative flex-1 sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search expenses..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-[#e0d9f7] rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#34088f]/20 transition-all placeholder:text-gray-400 text-gray-900"
        />
      </div>

      {/* Category Dropdown */}
      <div className="relative shrink-0">
        <select
          value={defaultCategoryId}
          onChange={handleCategoryChange}
          className="w-full sm:w-auto appearance-none pl-4 pr-10 py-2 border border-[#e0d9f7] rounded-full text-sm font-semibold text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#34088f]/20 transition-all cursor-pointer"
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}
