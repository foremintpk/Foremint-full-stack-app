'use client';

import React, { useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface InvoicePaginationProps {
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export function InvoicePagination({
  totalCount,
  totalPages,
  currentPage,
  pageSize,
}: InvoicePaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  if (totalPages <= 1) return null;

  // Calculate shown offsets
  const startOffset = (currentPage - 1) * pageSize + 1;
  const endOffset = Math.min(currentPage * pageSize, totalCount);

  // Generate URL preserving all other query parameters
  const updatePageParam = (pageNumber: number): string => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(pageNumber));
    return `/admin/invoices?${params.toString()}`;
  };

  const handlePageClick = (pageNumber: number): void => {
    if (pageNumber < 1 || pageNumber > totalPages || pageNumber === currentPage || isPending) return;
    startTransition(() => {
      router.push(updatePageParam(pageNumber) as any);
    });
  };

  // Generate visible page numbers (max 5 around current page)
  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, currentPage + 2);

      if (currentPage <= 3) {
        start = 1;
        end = maxVisible;
      } else if (currentPage >= totalPages - 2) {
        start = totalPages - maxVisible + 1;
        end = totalPages;
      }

      if (start > 1) {
        pages.push(1);
        if (start > 2) pages.push('...');
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages) {
        if (end < totalPages - 1) pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const pages = getPageNumbers();

  return (
    <nav
      aria-label="Invoices list pagination"
      className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-5 bg-white border border-[#e0d9f7] border-t-0 rounded-b-2xl shadow-[0_1px_4px_rgba(52,8,143,0.06)]"
    >
      <div className="text-xs text-gray-500 font-inter">
        Showing <span className="font-semibold text-gray-900">{startOffset}</span>–
        <span className="font-semibold text-gray-900">{endOffset}</span> of{' '}
        <span className="font-semibold text-gray-900">{totalCount}</span> results
      </div>

      <div className="flex items-center gap-1.5">
        {/* Previous Button */}
        <button
          onClick={() => handlePageClick(currentPage - 1)}
          disabled={currentPage === 1 || isPending}
          className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-[#f4f0fe] hover:text-[#34088f] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 rounded-full flex items-center gap-1.5 border border-transparent hover:border-[#e0d9f7]"
        >
          {isPending && currentPage > 1 ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          Previous
        </button>

        {/* Page pills */}
        {pages.map((p, idx) => {
          if (p === '...') {
            return (
              <span key={`dots-${idx}`} className="px-2 py-1 text-xs text-gray-400">
                ...
              </span>
            );
          }

          const pageNum = p as number;
          const isActive = pageNum === currentPage;

          return (
            <button
              key={`page-${pageNum}`}
              onClick={() => handlePageClick(pageNum)}
              disabled={isPending}
              aria-current={isActive ? 'page' : undefined}
              className={`w-8 h-8 flex items-center justify-center text-xs font-bold rounded-full transition-all duration-200 ${
                isActive
                  ? 'bg-[#34088f] text-white shadow-sm'
                  : 'bg-gray-100 hover:bg-[#f4f0fe] hover:text-[#34088f] text-gray-700 disabled:opacity-50 border border-transparent hover:border-[#e0d9f7]'
              }`}
            >
              {isPending && isActive ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : pageNum}
            </button>
          );
        })}

        {/* Next Button */}
        <button
          onClick={() => handlePageClick(currentPage + 1)}
          disabled={currentPage === totalPages || isPending}
          className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-[#f4f0fe] hover:text-[#34088f] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 rounded-full flex items-center gap-1.5 border border-transparent hover:border-[#e0d9f7]"
        >
          Next
          {isPending && currentPage < totalPages ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
        </button>
      </div>
    </nav>
  );
}
export default InvoicePagination;
