/**
 * @file src/app/admin/(dashboard)/overview/loading.tsx
 * @description Beautiful loading skeleton layout specifically customized for the overview dashboard view.
 * 
 * 1. Server vs Client choice rationale: Server Component.
 * 2. Caching layer: N/A.
 * 3. RBAC: N/A.
 * 4. Revalidation / Cache Busting: N/A.
 */

import React from 'react';

export default function OverviewLoading() {
 return (
 <div className="space-y-6 animate-pulse">
 {/* Header Skeleton */}
 <div className="space-y-2">
 <div className="h-6 w-32 bg-gray-200 rounded-[0.125rem]" />
 <div className="h-4 w-64 bg-gray-200 rounded-[0.125rem]" />
 </div>

 {/* Date Filter Pills Skeleton */}
 <div className="flex gap-2 overflow-x-auto pb-1 max-w-full">
 {Array.from({ length: 7 }).map((_, i) => (
 <div
 key={i}
 className="h-7 w-20 bg-gray-200 rounded-[0.125rem] flex-shrink-0"
 />
 ))}
 </div>

 {/* Main Grid Skeletons */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {/* Stat Card 1 Skeleton */}
 <div className="bg-white border border-[#ebebeb] rounded-[0.125rem] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex flex-col justify-between h-[300px]">
 <div>
 <div className="flex items-center gap-3">
 <div className="w-9 h-9 bg-gray-200 rounded-[0.125rem]" />
 <div className="h-4 w-32 bg-gray-200 rounded-[0.125rem]" />
 </div>
 <div className="mt-6 space-y-2">
 <div className="h-8 w-16 bg-gray-200 rounded-[0.125rem]" />
 <div className="h-3.5 w-24 bg-gray-200 rounded-[0.125rem]" />
 </div>
 </div>
 <div className="border-t border-gray-100 pt-4 space-y-3">
 <div className="h-3 w-full bg-gray-200 rounded-[0.125rem]" />
 <div className="h-3 w-full bg-gray-200 rounded-[0.125rem]" />
 <div className="h-3 w-full bg-gray-200 rounded-[0.125rem]" />
 </div>
 </div>

 {/* Stat Card 2 Skeleton */}
 <div className="bg-white border border-[#ebebeb] rounded-[0.125rem] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex flex-col justify-between h-[300px]">
 <div>
 <div className="flex items-center gap-3">
 <div className="w-9 h-9 bg-gray-200 rounded-[0.125rem]" />
 <div className="h-4 w-32 bg-gray-200 rounded-[0.125rem]" />
 </div>
 <div className="mt-6 space-y-2">
 <div className="h-8 w-16 bg-gray-200 rounded-[0.125rem]" />
 <div className="h-3.5 w-24 bg-gray-200 rounded-[0.125rem]" />
 </div>
 </div>
 <div className="border-t border-gray-100 pt-4 space-y-3">
 <div className="h-3 w-full bg-gray-200 rounded-[0.125rem]" />
 <div className="h-3 w-full bg-gray-200 rounded-[0.125rem]" />
 <div className="h-3 w-full bg-gray-200 rounded-[0.125rem]" />
 </div>
 </div>

 {/* Earnings Card Skeleton */}
 <div className="bg-white border border-[#ebebeb] rounded-[0.125rem] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] md:col-span-2 space-y-6">
 <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-100 pb-6 gap-4">
 <div className="space-y-3">
 <div className="h-4 w-40 bg-gray-200 rounded-[0.125rem]" />
 <div className="h-10 w-48 bg-gray-200 rounded-[0.125rem]" />
 <div className="h-3.5 w-32 bg-gray-200 rounded-[0.125rem]" />
 </div>
 </div>

 <div className="space-y-6 pt-2">
 <div className="space-y-2">
 <div className="flex justify-between">
 <div className="h-3.5 w-24 bg-gray-200 rounded-[0.125rem]" />
 <div className="h-3.5 w-28 bg-gray-200 rounded-[0.125rem]" />
 </div>
 <div className="h-2 bg-gray-200 rounded-full w-full" />
 </div>
 <div className="space-y-2">
 <div className="flex justify-between">
 <div className="h-3.5 w-24 bg-gray-200 rounded-[0.125rem]" />
 <div className="h-3.5 w-28 bg-gray-200 rounded-[0.125rem]" />
 </div>
 <div className="h-2 bg-gray-200 rounded-full w-full" />
 </div>
 <div className="space-y-2">
 <div className="flex justify-between">
 <div className="h-3.5 w-24 bg-gray-200 rounded-[0.125rem]" />
 <div className="h-3.5 w-28 bg-gray-200 rounded-[0.125rem]" />
 </div>
 <div className="h-2 bg-gray-200 rounded-full w-full" />
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}
