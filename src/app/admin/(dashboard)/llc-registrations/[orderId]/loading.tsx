/**
 * @file src/app/admin/(dashboard)/llc-registrations/[orderId]/loading.tsx
 * @description Beautiful loading skeleton screen for LLC order details page.
 */

import React from 'react';

export default function Loading() {
  return (
    <div className="w-full space-y-6 animate-pulse">
      {/* Breadcrumb Skeleton */}
      <div className="h-4 bg-gray-200 rounded-[0.125rem] w-64" />

      {/* Header Skeleton Card */}
      <div className="bg-white border border-[#e0d9f7] rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded-[0.125rem] w-40" />
            <div className="h-7 bg-gray-300 rounded-[0.125rem] w-72" />
            <div className="h-4 bg-gray-200 rounded-[0.125rem] w-96" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-9 bg-gray-200 rounded-full w-36" />
            <div className="h-9 bg-gray-300 rounded-full w-32" />
          </div>
        </div>
      </div>

      {/* Main Accordion Skeleton Card */}
      <div className="bg-white border border-[#e0d9f7] rounded-2xl shadow-sm overflow-hidden">
        {/* Accordion Outer Header */}
        <div className="bg-gray-50 border-b border-[#e0d9f7] px-6 py-4 flex items-center justify-between">
          <div className="h-5 bg-gray-300 rounded-[0.125rem] w-48" />
          <div className="h-4 bg-gray-200 rounded-full w-4" />
        </div>

        <div className="p-6 space-y-6">
          {/* Sub-Section 1: General Info */}
          <div className="border border-[#e0d9f7] rounded-xl overflow-hidden">
            <div className="bg-gray-50/55 px-5 py-3 border-b border-[#e0d9f7] flex justify-between">
              <div className="h-4 bg-gray-300 rounded-[0.125rem] w-32" />
              <div className="h-4 bg-gray-200 rounded-[0.125rem] w-12" />
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="h-3 bg-gray-100 rounded-[0.125rem] w-20" />
                <div className="h-4 bg-gray-200 rounded-[0.125rem] w-44" />
              </div>
              <div className="space-y-1">
                <div className="h-3 bg-gray-100 rounded-[0.125rem] w-20" />
                <div className="h-4 bg-gray-200 rounded-[0.125rem] w-44" />
              </div>
            </div>
          </div>

          {/* Sub-Section 2: Formation Info */}
          <div className="border border-[#e0d9f7] rounded-xl overflow-hidden">
            <div className="bg-gray-50/55 px-5 py-3 border-b border-[#e0d9f7] flex justify-between">
              <div className="h-4 bg-gray-300 rounded-[0.125rem] w-32" />
              <div className="h-4 bg-gray-200 rounded-[0.125rem] w-12" />
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="h-3 bg-gray-100 rounded-[0.125rem] w-20" />
                <div className="h-4 bg-gray-200 rounded-[0.125rem] w-44" />
              </div>
              <div className="space-y-1">
                <div className="h-3 bg-gray-100 rounded-[0.125rem] w-20" />
                <div className="h-4 bg-gray-200 rounded-[0.125rem] w-44" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
