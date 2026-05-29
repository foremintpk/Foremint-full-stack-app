/**
 * @file src/app/admin/(dashboard)/overview/_components/EarningsCard.tsx
 * @description Beautiful full-width Total Earnings summary card mapping cash metrics to animated horizontal bars.
 * 
 * 1. Server vs Client choice rationale: Server Component wrapping Client animated progress bars.
 * 2. Caching layer: N/A.
 * 3. RBAC: N/A.
 * 4. Revalidation / Cache Busting: N/A.
 */

import React from 'react';
import { EarningsBreakdown } from '@/types/admin';
import { formatPKR } from '@/lib/admin/formatters';
import { STATUS_COLORS } from '@/lib/admin/statusColors';
import { EarningsBar } from './EarningsBar';

interface EarningsCardProps {
 earnings: EarningsBreakdown;
}

export function EarningsCard({ earnings }: EarningsCardProps) {
 const isZeroState = earnings.totalEarnings === 0;

 return (
 <article
 aria-label="Revenue breakdown statistics"
 className="bg-white border border-[#e0d9f7] rounded-2xl p-6 shadow-[0_1px_4px_rgba(52,8,143,0.06)] hover:shadow-[0_8px_24px_rgba(52,8,143,0.10)] transition-all duration-200 ease-in-out md:col-span-2"
 >
 {/* Top Total Revenue portion */}
 <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-100 pb-6">
 <div>
 <span
 className="text-[12px] font-bold text-gray-500 uppercase tracking-wider font-inter"
 >
 Total Earnings (PKR)
 </span>
 <h2
 className="text-[32px] font-bold text-black font-manrope leading-none mt-3"
 aria-label={`Total Earnings: ${formatPKR(earnings.totalEarnings)}`}
 >
 {formatPKR(earnings.totalEarnings)}
 </h2>
 <p className="text-[11px] font-medium text-gray-400 font-inter mt-1.5 uppercase tracking-wider">
 All revenue combined
 </p>
 </div>
 
 {isZeroState && (
 <div className="flex items-center">
 <span className="text-xs font-bold text-[#f59e0b] bg-[#f59e0b]/10 px-3.5 py-1.5 rounded-full font-manrope uppercase tracking-wider animate-pulse">
 No revenue recorded in this period
 </span>
 </div>
 )}
 </div>

 {/* Horizontal percentage metric bars grid */}
 <div className="mt-6 space-y-5">
 <EarningsBar
 label="LLC Formations"
 amount={earnings.llcRevenue}
 percent={earnings.llcPercent}
 colorClass={STATUS_COLORS.completed} // Emerald
 />

 <EarningsBar
 label="PayPal Accounts"
 amount={earnings.paypalRevenue}
 percent={earnings.paypalPercent}
 colorClass={STATUS_COLORS.processing} // Blue
 />

 <EarningsBar
 label="Invoice Commissions"
 amount={earnings.invoiceCommissions}
 percent={earnings.invoicePercent}
 colorClass="#34088f" // Foremint Deep Violet
 />
 </div>
 </article>
 );
}
