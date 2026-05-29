import React from 'react';

export default function PaypalAccountsLoading() {
  return (
    <div className="w-full space-y-8 animate-pulse p-6">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-gray-200 rounded-full" />
          <div className="h-4 w-64 bg-gray-100 rounded-full" />
        </div>
        <div className="h-10 w-32 bg-gray-200 rounded-full shrink-0" />
      </div>

      {/* 5 Stats Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-[#e0d9f7] bg-white p-5 shadow-[0_1px_4px_rgba(52,8,143,0.06)] flex items-center justify-between"
          >
            <div className="space-y-3 flex-1">
              <div className="h-3 w-16 bg-gray-200 rounded-full" />
              <div className="h-6 w-24 bg-gray-300 rounded-full" />
            </div>
            <div className="h-12 w-12 rounded-full bg-gray-100 shrink-0" />
          </div>
        ))}
      </div>

      {/* Controls Row Skeleton */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
        <div className="h-10 max-w-lg flex-1 bg-gray-200 rounded-full" />
        <div className="flex flex-wrap items-center gap-3">
          <div className="h-10 w-28 bg-gray-200 rounded-full" />
          <div className="h-10 w-28 bg-gray-200 rounded-full" />
          <div className="h-10 w-28 bg-gray-200 rounded-full" />
        </div>
      </div>

      {/* Count Info Skeleton */}
      <div className="h-4 w-40 bg-gray-100 rounded-full" />

      {/* Table Skeleton */}
      <div className="w-full border border-[#e0d9f7] rounded-2xl overflow-hidden bg-white shadow-[0_1px_4px_rgba(52,8,143,0.06)]">
        {/* Table Header Skeleton */}
        <div className="grid grid-cols-[1.2fr_1.5fr_1fr_1fr_0.8fr_0.8fr_0.6fr] gap-4 px-6 py-4 bg-[#f4f0fe] border-b border-[#e0d9f7]">
          {Array.from({ length: 7 }).map((_, idx) => (
            <div key={idx} className="h-3 bg-gray-200 rounded-full w-3/4" />
          ))}
        </div>

        {/* 8 Rows Skeleton */}
        <div className="divide-y divide-[#e0d9f7]">
          {Array.from({ length: 8 }).map((_, rIdx) => (
            <div
              key={rIdx}
              className="grid grid-cols-[1.2fr_1.5fr_1fr_1fr_0.8fr_0.8fr_0.6fr] gap-4 px-6 py-5 bg-white items-center"
            >
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded-full w-5/6" />
                <div className="h-2.5 bg-gray-100 rounded-full w-1/2" />
              </div>
              <div className="h-3.5 bg-gray-200 rounded-full w-4/5" />
              <div className="h-3.5 bg-gray-200 rounded-full w-2/3" />
              <div className="h-4 bg-gray-200 rounded-full w-1/2" />
              <div className="h-6 bg-gray-150 rounded-full w-16" />
              <div className="h-6 bg-gray-150 rounded-full w-20" />
              <div className="flex justify-end">
                <div className="h-8 w-8 bg-gray-100 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
