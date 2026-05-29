'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ExpensePaginationProps {
  currentPage: number;
  totalPages: number;
}

export function ExpensePagination({ currentPage, totalPages }: ExpensePaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex items-center justify-between border-t border-[#e0d9f7] pt-4 font-inter select-text">
      <button
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="flex items-center gap-1 text-sm font-semibold text-gray-600 hover:text-[#34088f] disabled:opacity-50 disabled:hover:text-gray-600 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Previous
      </button>

      <span className="text-sm text-gray-600 font-medium">
        Page {currentPage} of {totalPages}
      </span>

      <button
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="flex items-center gap-1 text-sm font-semibold text-gray-600 hover:text-[#34088f] disabled:opacity-50 disabled:hover:text-gray-600 transition-colors"
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
