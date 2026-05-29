/**
 * @file src/app/admin/(dashboard)/overview/_components/StatCard.tsx
 * @description Sleek, premium stats summary card utilizing semantic HTML and deep micro-interactions.
 * 
 * 1. Server vs Client choice rationale: Server Component by default.
 * 2. Caching layer: N/A.
 * 3. RBAC: N/A.
 * 4. Revalidation / Cache Busting: N/A.
 */

import React from 'react';
import { StatusKey } from '@/lib/admin/statusColors';
import { SubStatRow } from './SubStatRow';

interface StatCardProps {
 title: string;
 icon: React.ReactNode;
 iconBg: string;
 iconColor: string;
 total: number;
 stats: {
 label: string;
 value: number;
 statusKey: StatusKey;
 }[];
}

export function StatCard({
 title,
 icon,
 iconBg,
 iconColor,
 total,
 stats,
}: StatCardProps) {
 return (
 <article
 aria-label={`${title} statistics`}
 className="bg-white border border-[#e0d9f7] rounded-2xl p-6 shadow-[0_1px_4px_rgba(52,8,143,0.06)] hover:shadow-[0_8px_24px_rgba(52,8,143,0.10)] transition-all duration-200 ease-in-out flex flex-col justify-between"
 >
 <div>
 {/* Card Header section */}
 <div className="flex items-center gap-3">
 <div
 className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg} ${iconColor} flex-shrink-0`}
 >
 {icon}
 </div>
 <span
 className="text-[12px] font-bold text-gray-500 uppercase tracking-wider font-inter"
 >
 {title}
 </span>
 </div>

 {/* Dynamic Display stats and totals */}
 <div className="mt-5">
 <h2
 className="text-[28px] font-bold text-black font-manrope leading-none"
 >
 {total}
 </h2>
 <p
 className="text-[11px] font-medium text-gray-400 font-inter uppercase mt-1 tracking-wider"
 >
 Total Orders
 </p>

 {total === 0 && (
 <p className="text-[11px] text-[#f59e0b] font-medium font-inter mt-1.5 animate-pulse">
 No orders in this period
 </p>
 )}
 </div>
 </div>

 {/* Sub-state status aggregates breakdown layout */}
 <div className="mt-6 border-t border-gray-100 pt-4 space-y-1">
 {stats.map((item) => (
 <SubStatRow
 key={item.label}
 label={item.label}
 value={item.value}
 statusKey={item.statusKey}
 />
 ))}
 </div>
 </article>
 );
}
