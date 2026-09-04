/**
 * @file src/app/admin/(dashboard)/invoice-generator/loading.tsx
 * @description Skeleton for the invoice builder: form column on the left,
 * summary and download panel on the right.
 */

import React from 'react';

export default function InvoiceGeneratorLoading(): React.JSX.Element {
  const card = 'bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4';

  return (
    <div className="w-full flex flex-col gap-6 animate-pulse font-inter">
      {/* Title */}
      <div className="flex flex-col gap-2">
        <div className="h-8 w-56 bg-gray-200 rounded-[0.125rem]" />
        <div className="h-3.5 w-96 max-w-full bg-gray-200 rounded-[0.125rem]" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        {/* Form column */}
        <div className="flex flex-col gap-6">
          {/* Invoice details — a 2-column field grid */}
          <div className={card}>
            <div className="h-4 w-32 bg-gray-200 rounded-[0.125rem]" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <div className="h-2.5 w-24 bg-gray-200 rounded-[0.125rem]" />
                  <div className="h-9 w-full bg-gray-100 rounded-lg" />
                </div>
              ))}
            </div>
          </div>

          {/* Package + filing fee */}
          <div className={card}>
            <div className="h-4 w-44 bg-gray-200 rounded-[0.125rem]" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <div className="h-2.5 w-20 bg-gray-200 rounded-[0.125rem]" />
                  <div className="h-9 w-full bg-gray-100 rounded-lg" />
                </div>
              ))}
            </div>
          </div>

          {/* Add-ons */}
          <div className={card}>
            <div className="h-4 w-20 bg-gray-200 rounded-[0.125rem]" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-11 w-full bg-gray-100 border border-gray-200 rounded-lg" />
              ))}
            </div>
            <div className="h-10 w-full bg-gray-50 border border-dashed border-gray-200 rounded-lg" />
          </div>
        </div>

        {/* Summary + download */}
        <div className="flex flex-col gap-4">
          <div className={card}>
            <div className="h-4 w-24 bg-gray-200 rounded-[0.125rem]" />
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-4">
                <div className="h-3 w-28 bg-gray-200 rounded-[0.125rem]" />
                <div className="h-3 w-14 bg-gray-200 rounded-[0.125rem]" />
              </div>
            ))}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-4">
              <div className="h-4 w-28 bg-gray-200 rounded-[0.125rem]" />
              <div className="h-4 w-20 bg-gray-200 rounded-[0.125rem]" />
            </div>
          </div>

          <div className={card}>
            <div className="h-4 w-20 bg-gray-200 rounded-[0.125rem]" />
            <div className="h-10 w-full bg-gray-100 rounded-lg" />
          </div>

          <div className="h-11 w-full bg-gray-200 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
