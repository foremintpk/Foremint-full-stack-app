import React from 'react';

export default function AddonsLoading() {
  return (
    <div className="w-full space-y-8 animate-pulse p-6">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-gray-200 rounded-full" />
          <div className="h-4 w-64 bg-gray-100 rounded-full" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-36 bg-gray-200 rounded-full shrink-0" />
          <div className="h-10 w-28 bg-[#f4f0fe] rounded-full shrink-0" />
        </div>
      </div>

      {/* Tabs and Controls Skeleton */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
        {/* Category Tabs */}
        <div className="flex gap-2 w-full lg:w-auto overflow-hidden">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="h-8 w-24 bg-gray-200 rounded-full shrink-0" />
          ))}
        </div>
        
        {/* Search and Filter */}
        <div className="flex gap-3 w-full lg:w-auto shrink-0">
          <div className="h-10 w-48 bg-gray-200 rounded-full" />
          <div className="h-10 w-32 bg-gray-200 rounded-full" />
        </div>
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-[#e0d9f7] bg-white p-5 space-y-4"
          >
            <div className="flex justify-between items-start">
              <div className="h-6 bg-gray-200 rounded-full w-2/3" />
              <div className="h-4 bg-gray-200 rounded-full w-12" />
            </div>
            <div className="h-8 bg-gray-100 rounded-full w-24" />
            <div className="flex gap-1.5">
              <div className="h-4 bg-[#f4f0fe] rounded-full w-16" />
              <div className="h-4 bg-[#f4f0fe] rounded-full w-12" />
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded-full w-full" />
              <div className="h-3 bg-gray-200 rounded-full w-5/6" />
              <div className="h-3 bg-gray-200 rounded-full w-4/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
