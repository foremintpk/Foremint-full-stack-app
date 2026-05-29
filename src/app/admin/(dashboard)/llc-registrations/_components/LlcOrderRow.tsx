/**
 * @file src/app/admin/(dashboard)/llc-registrations/_components/LlcOrderRow.tsx
 * @description Capsule-card row for the LLC registrations list table (desktop view).
 *
 * Uses div-based grid rows (not <table><tr>) to avoid the <Link><tr> invalid HTML nesting
 * hydration error. Row is fully clickable, keyboard-navigable, and accessible.
 */

'use client';

import React, { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { LlcOrderRow as LlcOrderRowType } from '@/types/admin';
import LlcStatusBadge from './LlcStatusBadge';
import LlcNewBadge from './LlcNewBadge';
import { formatPKR, formatDate, timeAgo } from '@/lib/admin/formatters';

interface LlcOrderRowProps {
 order: LlcOrderRowType;
}

export default function LlcOrderRow({ order }: LlcOrderRowProps): React.JSX.Element {
 const router = useRouter();
 const [isPending, startTransition] = useTransition();
 const href = `/admin/llc-registrations/${order.id}`;

 const handleClick = () => {
 if (isPending) return;
 startTransition(() => {
 router.push(href as any);
 });
 };

 const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
 if (isPending) return;
 if (e.key === 'Enter' || e.key === ' ') {
 e.preventDefault();
 startTransition(() => {
 router.push(href as any);
 });
 }
 };

 return (
 <div
 role="row"
 tabIndex={isPending ? -1 : 0}
 onClick={handleClick}
 onKeyDown={handleKeyDown}
 aria-label={`View order ${order.orderNumber} — ${order.llcName}`}
 className={`grid grid-cols-[1fr_1.2fr_1.4fr_0.9fr_0.9fr_0.9fr] gap-0 px-6 py-3.5 bg-white border rounded-2xl group transition-all duration-150 items-center ${
 isPending 
 ? 'border-[#c4b5fd] bg-[#fdfcff] opacity-70 cursor-wait shadow-sm' 
 : 'border-[#e0d9f7] shadow-[0_1px_4px_rgba(52,8,143,0.06)] cursor-pointer hover:border-[#c4b5fd] hover:shadow-[0_2px_12px_rgba(52,8,143,0.07)] hover:bg-[#fdfcff] focus:outline-none focus:border-[#34088f] focus:shadow-[0_0_0_3px_rgba(52,8,143,0.1)]'
 }`}
 >
 {/* Column 1 — Order Number */}
 <div role="cell" className="text-sm font-semibold text-[#111111] group-hover:text-[#34088f] transition-colors">
 <div className="flex items-center gap-1.5">
 {isPending ? <Loader2 className="w-4 h-4 animate-spin text-[#34088f]" /> : null}
 {order.orderNumber}
 {order.isNew && <LlcNewBadge />}
 </div>
 </div>

 {/* Column 2 — Client */}
 <div role="cell" className="text-sm text-[#111111]">
 <p className="font-medium truncate">{order.clientName ?? '—'}</p>
 <p className="text-xs text-[#6b7280] truncate">{order.clientEmail}</p>
 </div>

 {/* Column 3 — LLC Name */}
 <div role="cell" className="text-sm text-[#111111]">
 <p className="font-semibold group-hover:text-[#34088f] transition-colors truncate">{order.llcName}</p>
 <p className="text-xs text-[#6b7280]">{order.formationState ?? '—'}</p>
 </div>

 {/* Column 4 — Status */}
 <div role="cell" className="text-sm">
 <LlcStatusBadge status={order.status} />
 </div>

 {/* Column 5 — Date */}
 <div role="cell" className="text-sm text-[#111111]">
 <p>{formatDate(order.submittedAt ?? order.createdAt)}</p>
 <p className="text-xs text-[#6b7280]">{timeAgo(order.createdAt)}</p>
 </div>

 {/* Column 6 — Pending Amount */}
 <div role="cell" className="text-right text-sm">
 {order.paymentStatus !== 'paid' && order.pendingAmount > 0 ? (
 <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#fff7ed] text-[#c2410c] border border-[#fed7aa]">
 {formatPKR(order.pendingAmount)}
 </span>
 ) : (
 <span className="text-[#d1d5db] text-xs">—</span>
 )}
 </div>
 </div>
 );
}
