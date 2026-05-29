/**
 * @file src/app/admin/packages/loading.tsx
 * @description Beautiful custom skeleton loader mirroring the real packages page.
 */

import React from 'react';

export default function PackagesLoading(): React.JSX.Element {
  return (
    <div className="space-y-6 font-inter animate-pulse">
      {/* Header Row Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-56 rounded-full bg-gray-200" />
          <div className="h-3 w-72 rounded-full bg-gray-200" />
        </div>
        <div className="h-10 w-36 rounded-full bg-gray-200" />
      </div>

      {/* Filter Tabs Skeleton */}
      <div className="flex items-center gap-2">
        <div className="h-9 w-20 rounded-full bg-gray-200" />
        <div className="h-9 w-28 rounded-full bg-gray-200" />
        <div className="h-9 w-24 rounded-full bg-gray-200" />
      </div>

      {/* 3x2 Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-[#e0d9f7] bg-white p-6 shadow-[0_1px_4px_rgba(52,8,143,0.06)] flex flex-col justify-between h-[360px]"
          >
            <div>
              {/* Status Badge & Action Icons Skeleton */}
              <div className="flex items-center justify-between mb-4">
                <div className="h-5.5 w-20 rounded-full bg-gray-200" />
                <div className="flex gap-2">
                  <div className="h-8 w-8 rounded-full bg-gray-200" />
                  <div className="h-8 w-8 rounded-full bg-gray-200" />
                </div>
              </div>

              {/* Title & Price Skeleton */}
              <div className="mb-5 space-y-2">
                <div className="h-6 w-3/4 rounded-full bg-gray-200" />
                <div className="h-8 w-1/2 rounded-full bg-gray-200" />
              </div>

              {/* Divider Skeleton */}
              <hr className="border-t border-[#e0d9f7] mb-5" />

              {/* Features List Skeleton */}
              <div className="space-y-3">
                {[...Array(4)].map((_, fIdx) => (
                  <div key={fIdx} className="flex items-center gap-3">
                    <div className="h-5 w-5 shrink-0 rounded-full bg-gray-200" />
                    <div className="h-3.5 w-5/6 rounded-full bg-gray-200" />
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Row Skeleton */}
            <div className="mt-6 flex items-center justify-between">
              <div className="h-3 w-16 rounded-full bg-gray-200" />
              <div className="h-3 w-28 rounded-full bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
