/**
 * @file src/app/admin/(dashboard)/users/loading.tsx
 * @description Beautiful custom skeleton loader mirroring the real users management page structure.
 */

import React from 'react';

export default function UsersLoading(): React.JSX.Element {
  return (
    <div className="space-y-6 font-inter animate-pulse select-none">
      {/* Header Row Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-28 rounded-full bg-gray-200" />
          <div className="h-3.5 w-72 rounded-full bg-gray-200" />
        </div>
        <div className="h-10 w-28 rounded-full bg-gray-200 shrink-0" />
      </div>

      {/* Controls Skeleton */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
        <div className="h-10 flex-1 max-w-lg rounded-full bg-gray-200" />
        <div className="flex items-center gap-3">
          <div className="h-10 w-28 rounded-full bg-gray-200" />
          <div className="h-10 w-28 rounded-full bg-gray-200" />
        </div>
      </div>

      {/* Results count text skeleton */}
      <div className="h-3.5 w-36 rounded-full bg-gray-200" />

      {/* List Rows Skeleton (Desktop Header + 8 Rows) */}
      <div className="space-y-3">
        {/* Header Skeleton */}
        <div className="hidden md:grid grid-cols-[1.5fr_1fr_1fr_0.8fr_1fr_0.8fr] gap-0 px-6 py-3.5 bg-gray-50 rounded-2xl border border-[#e0d9f7]">
          {[...Array(6)].map((_, idx) => (
            <div key={idx} className="h-3 w-16 rounded-full bg-gray-200" />
          ))}
        </div>

        {/* 8 Rows Skeleton */}
        {[...Array(8)].map((_, idx) => (
          <div
            key={idx}
            className="grid grid-cols-[1.5fr_1fr_1fr_0.8fr_1fr_0.8fr] gap-0 px-6 py-5 bg-white border border-[#e0d9f7] rounded-2xl items-center"
          >
            {/* User details */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
              <div className="space-y-2 w-full pr-4">
                <div className="h-3.5 w-24 rounded-full bg-gray-200" />
                <div className="h-2.5 w-32 rounded-full bg-gray-200" />
              </div>
            </div>
            {/* Phone */}
            <div className="h-3.5 w-28 rounded-full bg-gray-200" />
            {/* Role */}
            <div className="h-6 w-16 rounded-full bg-gray-200" />
            {/* Status */}
            <div className="h-6 w-14 rounded-full bg-gray-200" />
            {/* Joined */}
            <div className="h-3.5 w-20 rounded-full bg-gray-200" />
            {/* Actions */}
            <div className="flex justify-end">
              <div className="h-8 w-8 rounded-full bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
