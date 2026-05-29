/**
 * @file src/app/admin/(dashboard)/llc-registrations/loading.tsx
 * @description Beautiful page-specific skeletons loader representing order tables, pills, search metrics, and page counts.
 */

import React from 'react';

export default function LlcRegistrationsLoading(): React.JSX.Element {
 return (
 <div className="w-full flex flex-col gap-6 animate-pulse">
 {/* Breadcrumb skeleton placeholder */}
 <div className="h-4 w-48 bg-gray-200 rounded-[0.125rem]" />

 {/* Header text skeletons */}
 <div className="flex flex-col gap-2">
 <div className="h-8 w-64 bg-gray-200 rounded-[0.125rem]" />
 <div className="h-4 w-32 bg-gray-200 rounded-[0.125rem]" />
 </div>

 {/* Top 4 stat pills skeletons */}
 <div className="flex items-center gap-3 overflow-x-auto pb-2 shrink-0">
 {[...Array(4)].map((_, i) => (
 <div
 key={i}
 className="w-[120px] h-[38px] bg-gray-200 border border-gray-100 rounded-[0.125rem] shrink-0"
 />
 ))}
 </div>

 {/* Search & filters controls row skeleton */}
 <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between w-full">
 <div className="flex-1 h-10 bg-gray-200 rounded-[0.125rem]" />
 <div className="flex items-center gap-3 shrink-0">
 <div className="w-[130px] h-10 bg-gray-200 rounded-[0.125rem]" />
 <div className="w-[130px] h-10 bg-gray-200 rounded-[0.125rem]" />
 <div className="w-[90px] h-10 bg-gray-200 rounded-[0.125rem]" />
 </div>
 </div>

 {/* Table grid / card stack skeleton */}
 <div className="w-full border border-gray-200 rounded-t-[0.125rem] bg-white overflow-hidden">
 {/* Table Header skeleton */}
 <div className="bg-[#f9f9fb] h-[40px] border-b border-gray-200 flex items-center px-6 gap-6">
 <div className="h-3 w-16 bg-gray-300 rounded-[0.125rem]" />
 <div className="h-3 w-28 bg-gray-300 rounded-[0.125rem] flex-1" />
 <div className="h-3 w-32 bg-gray-300 rounded-[0.125rem] flex-1" />
 <div className="h-3 w-20 bg-gray-300 rounded-[0.125rem]" />
 <div className="h-3 w-24 bg-gray-300 rounded-[0.125rem]" />
 <div className="h-3 w-20 bg-gray-300 rounded-[0.125rem] text-right" />
 </div>

 {/* Rows skeletons: 8 rows count */}
 <div className="divide-y divide-gray-100">
 {[...Array(8)].map((_, i) => (
 <div key={i} className="h-[72px] flex items-center px-6 gap-6">
 <div className="h-4 w-16 bg-gray-200 rounded-[0.125rem]" />
 
 <div className="flex flex-col gap-1.5 flex-1">
 <div className="h-3.5 w-24 bg-gray-200 rounded-[0.125rem]" />
 <div className="h-3 w-36 bg-gray-200 rounded-[0.125rem]" />
 </div>
 
 <div className="flex flex-col gap-1.5 flex-1">
 <div className="h-3.5 w-32 bg-gray-200 rounded-[0.125rem]" />
 <div className="h-3 w-20 bg-gray-200 rounded-[0.125rem]" />
 </div>

 <div className="h-6 w-20 bg-gray-200 rounded-full" />
 
 <div className="flex flex-col gap-1.5 w-24">
 <div className="h-3.5 w-16 bg-gray-200 rounded-[0.125rem]" />
 <div className="h-3 w-12 bg-gray-200 rounded-[0.125rem]" />
 </div>

 <div className="h-4 w-16 bg-gray-200 rounded-[0.125rem] ml-auto" />
 </div>
 ))}
 </div>
 </div>

 {/* Pagination wrapper skeleton */}
 <div className="flex items-center justify-between border border-gray-200 border-t-0 bg-white rounded-b-[0.125rem] p-4 h-[56px] -mt-6">
 <div className="h-3 w-40 bg-gray-200 rounded-[0.125rem]" />
 <div className="flex items-center gap-1.5">
 <div className="h-8 w-16 bg-gray-200 rounded-[0.125rem]" />
 <div className="h-8 w-8 bg-gray-200 rounded-[0.125rem]" />
 <div className="h-8 w-8 bg-gray-200 rounded-[0.125rem]" />
 <div className="h-8 w-8 bg-gray-200 rounded-[0.125rem]" />
 <div className="h-8 w-16 bg-gray-200 rounded-[0.125rem]" />
 </div>
 </div>
 </div>
 );
}
