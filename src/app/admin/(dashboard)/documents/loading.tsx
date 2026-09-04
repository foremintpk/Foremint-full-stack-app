/**
 * @file src/app/admin/(dashboard)/documents/loading.tsx
 * @description Skeleton for the Documents section: drop zone, then the
 * per-order coverage table.
 */

import React from 'react';

export default function DocumentsLoading(): React.JSX.Element {
  return (
    <div className="w-full flex flex-col gap-6 animate-pulse font-inter">
      {/* Title */}
      <div className="flex flex-col gap-2">
        <div className="h-8 w-40 bg-gray-200 rounded-[0.125rem]" />
        <div className="h-3.5 w-80 bg-gray-200 rounded-[0.125rem]" />
      </div>

      {/* Drop zone */}
      <div className="flex flex-col items-center justify-center gap-3 p-8 bg-white border-2 border-dashed border-gray-200 rounded-xl">
        <div className="h-6 w-6 bg-gray-200 rounded-full" />
        <div className="h-4 w-64 bg-gray-200 rounded-[0.125rem]" />
        <div className="h-3 w-96 max-w-full bg-gray-200 rounded-[0.125rem]" />
      </div>

      {/* Coverage */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div className="h-4 w-24 bg-gray-200 rounded-[0.125rem]" />
          <div className="h-3 w-96 max-w-full bg-gray-200 rounded-[0.125rem]" />
        </div>

        <div className="w-full border border-gray-200 rounded-xl bg-white overflow-hidden">
          {/* Search + filter toggles */}
          <div className="flex flex-wrap items-center gap-3 p-3 border-b border-gray-100">
            <div className="h-8 w-64 bg-gray-100 rounded-lg" />
            <div className="h-3.5 w-48 bg-gray-200 rounded-[0.125rem]" />
            <div className="h-3.5 w-40 bg-gray-200 rounded-[0.125rem]" />
          </div>

          {/* Header */}
          <div className="bg-gray-50 h-[38px] border-b border-gray-100 flex items-center px-3 gap-8">
            <div className="h-3 w-14 bg-gray-200 rounded-[0.125rem]" />
            <div className="h-3 w-24 bg-gray-200 rounded-[0.125rem] flex-1" />
            <div className="h-3 w-16 bg-gray-200 rounded-[0.125rem]" />
            <div className="h-3 w-24 bg-gray-200 rounded-[0.125rem]" />
            <div className="h-3 w-20 bg-gray-200 rounded-[0.125rem]" />
            <div className="h-3 w-12 bg-gray-200 rounded-[0.125rem]" />
          </div>

          {/* Three rows, matching the collapsed preview */}
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-[42px] flex items-center px-3 gap-8 border-b border-gray-50 last:border-0">
              <div className="h-3.5 w-16 bg-gray-200 rounded-[0.125rem]" />
              <div className="h-3.5 w-40 bg-gray-200 rounded-[0.125rem] flex-1" />
              <div className="h-3.5 w-4 bg-gray-200 rounded-full mx-auto" />
              <div className="h-3.5 w-4 bg-gray-200 rounded-full mx-auto" />
              <div className="h-3.5 w-4 bg-gray-200 rounded-full mx-auto" />
              <div className="h-3.5 w-4 bg-gray-200 rounded-full mx-auto" />
            </div>
          ))}

          <div className="h-[38px] flex items-center justify-center border-t border-gray-100">
            <div className="h-3.5 w-32 bg-gray-200 rounded-[0.125rem]" />
          </div>
        </div>
      </div>
    </div>
  );
}
