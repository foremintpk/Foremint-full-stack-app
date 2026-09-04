/**
 * @file src/app/admin/(dashboard)/ein/loading.tsx
 * @description Skeleton for the EIN section, shaped like the page it precedes:
 * automation bar, generated-document runs, then the pending-order preview.
 *
 * Matching the real layout matters more than looking busy — a skeleton whose
 * blocks land where the content lands reads as the page arriving rather than
 * the page changing.
 */

import React from 'react';

export default function EinLoading(): React.JSX.Element {
  return (
    <div className="w-full flex flex-col gap-6 animate-pulse font-inter">
      {/* Title + order count */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="h-8 w-24 bg-gray-200 rounded-[0.125rem]" />
          <div className="h-3.5 w-64 bg-gray-200 rounded-[0.125rem]" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-24 bg-gray-200 rounded-lg" />
          <div className="h-9 w-24 bg-gray-200 rounded-lg" />
        </div>
      </div>

      {/* Automation bar: mode toggle, day chips, API key row */}
      <div className="p-4 bg-white border border-gray-200 rounded-xl flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="h-4 w-32 bg-gray-200 rounded-[0.125rem]" />
          <div className="h-8 w-44 bg-gray-100 rounded-lg" />
        </div>

        <div className="pt-3 border-t border-gray-100 flex flex-col gap-2.5">
          <div className="h-3.5 w-48 bg-gray-200 rounded-[0.125rem]" />
          <div className="flex flex-wrap gap-2">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-[34px] w-[74px] bg-gray-100 border border-gray-200 rounded-lg" />
            ))}
          </div>
        </div>

        <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
          <div className="h-3.5 w-52 bg-gray-200 rounded-[0.125rem]" />
          <div className="flex items-center gap-2">
            <div className="h-8 flex-1 bg-gray-100 rounded-lg" />
            <div className="h-8 w-20 bg-gray-200 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Generated documents — collapsed run rows */}
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <div className="h-4 w-44 bg-gray-200 rounded-[0.125rem]" />
          <div className="h-3 w-56 bg-gray-200 rounded-[0.125rem]" />
        </div>
        {[...Array(2)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3.5 bg-white border border-gray-200 rounded-xl"
          >
            <div className="h-4 w-4 bg-gray-200 rounded-[0.125rem]" />
            <div className="flex flex-col gap-1.5 flex-1">
              <div className="h-3.5 w-52 bg-gray-200 rounded-[0.125rem]" />
              <div className="h-3 w-40 bg-gray-200 rounded-[0.125rem]" />
            </div>
            <div className="h-7 w-20 bg-gray-200 rounded-lg" />
            <div className="h-7 w-20 bg-gray-100 border border-gray-200 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Pending orders — three rows, matching the collapsed preview */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="h-4 w-32 bg-gray-200 rounded-[0.125rem]" />
          <div className="h-9 w-36 bg-gray-200 rounded-lg" />
        </div>

        <div className="h-14 w-full bg-gray-100 border border-gray-200 rounded-lg" />

        <div className="w-full border border-gray-200 rounded-xl bg-white overflow-hidden">
          <div className="p-3 border-b border-gray-100">
            <div className="h-8 w-64 bg-gray-100 rounded-lg" />
          </div>

          <div className="bg-gray-50 h-[38px] border-b border-gray-100 flex items-center px-3 gap-6">
            <div className="h-3 w-4 bg-gray-200 rounded-[0.125rem]" />
            {[16, 28, 32, 16, 24, 20].map((w, i) => (
              <div key={i} className="h-3 bg-gray-200 rounded-[0.125rem]" style={{ width: `${w * 4}px` }} />
            ))}
          </div>

          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-[46px] flex items-center px-3 gap-6 border-b border-gray-50 last:border-0">
              <div className="h-3.5 w-4 bg-gray-200 rounded-[0.125rem]" />
              <div className="h-3.5 w-16 bg-gray-200 rounded-[0.125rem]" />
              <div className="h-3.5 w-28 bg-gray-200 rounded-[0.125rem]" />
              <div className="h-3.5 w-32 bg-gray-200 rounded-[0.125rem]" />
              <div className="h-3.5 w-8 bg-gray-200 rounded-[0.125rem]" />
              <div className="h-5 w-12 bg-gray-200 rounded" />
              <div className="h-3.5 w-20 bg-gray-200 rounded-[0.125rem] ml-auto" />
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
