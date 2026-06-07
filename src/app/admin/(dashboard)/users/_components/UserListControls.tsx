/**
 * @file src/app/admin/(dashboard)/users/_components/UserListControls.tsx
 * @description Client Component for search and filters.
 */

'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Loader2 } from 'lucide-react';
import { UserListFilters } from '@/types/admin';

interface UserListControlsProps {
  filters: UserListFilters;
}

export function UserListControls({ filters }: UserListControlsProps): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [searchVal, setSearchVal] = useState(filters.search || '');

  // Debounce search input changes
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchVal.trim() !== (filters.search || '')) {
        updateQuery({ search: searchVal.trim() || undefined, page: undefined });
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchVal, filters.search]);

  // Sync searchVal with filters.search when filters change externally (e.g. back button)
  useEffect(() => {
    setSearchVal(filters.search || '');
  }, [filters.search]);

  const updateQuery = (updates: Record<string, string | undefined>) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());

      // If search/role/status updates, delete page parameter to reset pagination to page 1
      if ('search' in updates || 'role' in updates || 'status' in updates) {
        params.delete('page');
      }

      Object.entries(updates).forEach(([key, val]) => {
        if (val === undefined) {
          params.delete(key);
        } else {
          params.set(key, val);
        }
      });

      router.push(`/admin/users?${params.toString()}`);
    });
  };

  return (
    <div
      className={`flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center transition-opacity duration-150 font-inter ${
        isPending ? 'opacity-60' : 'opacity-100'
      }`}
    >
      {/* Search Input */}
      <div className="relative flex-1 max-w-lg">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
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
          placeholder="Search by name or email..."
          className="block w-full h-10 pl-11 pr-4 bg-white border border-[#e0d9f7] rounded-full text-sm text-[#111111] placeholder-[#9ca3af] outline-none focus:border-[#34088f] focus:ring-2 focus:ring-[#34088f]/20 transition-all font-inter"
        />
      </div>

      {/* Select Filters Group */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Role Select */}
        <div className="relative">
          <select
            value={filters.role || 'all'}
            onChange={(e) => updateQuery({ role: e.target.value !== 'all' ? e.target.value : undefined })}
            className="appearance-none h-10 pl-4 pr-10 bg-white border border-[#e0d9f7] rounded-full text-xs font-bold text-gray-700 cursor-pointer outline-none focus:border-[#34088f] focus:ring-2 focus:ring-[#34088f]/20 transition-all font-inter"
          >
            <option value="all">All Roles</option>
            <option value="administrator">Administrator</option>
            <option value="manager">Manager</option>
            <option value="customer">Customer</option>
            <option value="b2b_customer">B2B Customer</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5">
            <svg className="h-3.5 w-3.5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        </div>

        {/* Status Select */}
        <div className="relative">
          <select
            value={filters.status || 'all'}
            onChange={(e) => updateQuery({ status: e.target.value !== 'all' ? e.target.value : undefined })}
            className="appearance-none h-10 pl-4 pr-10 bg-white border border-[#e0d9f7] rounded-full text-xs font-bold text-gray-700 cursor-pointer outline-none focus:border-[#34088f] focus:ring-2 focus:ring-[#34088f]/20 transition-all font-inter"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5">
            <svg className="h-3.5 w-3.5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
export default UserListControls;
