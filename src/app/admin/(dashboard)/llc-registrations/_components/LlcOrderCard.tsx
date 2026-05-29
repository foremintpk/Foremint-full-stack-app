/**
 * @file src/app/admin/(dashboard)/llc-registrations/_components/LlcOrderCard.tsx
 * @description Capsule card layout for mobile screens (< 768px).
 * Fully clickable via router.push — no invalid Link wrapping block elements.
 */

'use client';

import React, { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { LlcOrderRow } from '@/types/admin';
import LlcStatusBadge from './LlcStatusBadge';
import LlcNewBadge from './LlcNewBadge';
import { formatPKR, formatDate } from '@/lib/admin/formatters';

interface LlcOrderCardProps {
 order: LlcOrderRow;
}

export default function LlcOrderCard({ order }: LlcOrderCardProps): React.JSX.Element {
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
 role="button"
 tabIndex={isPending ? -1 : 0}
 onClick={handleClick}
 onKeyDown={handleKeyDown}
 aria-label={`View order ${order.orderNumber} — ${order.llcName}`}
 className={`block bg-white border rounded-2xl p-4 transition-all duration-150 ${
 isPending
 ? 'border-[#c4b5fd] shadow-sm opacity-70 cursor-wait'
 : 'border-[#e0d9f7] shadow-[0_1px_4px_rgba(52,8,143,0.04)] hover:border-[#c4b5fd] hover:shadow-[0_4px_16px_rgba(52,8,143,0.08)] cursor-pointer focus:outline-none focus:border-[#34088f] focus:shadow-[0_0_0_3px_rgba(52,8,143,0.1)]'
 }`}
 >
 {/* Row 1: Order Number + NEW + Status */}
 <div className="flex items-center justify-between mb-3">
 <div className="flex items-center text-sm font-bold text-[#111111] gap-1.5">
 {isPending ? <Loader2 className="w-4 h-4 animate-spin text-[#34088f]" /> : null}
 {order.orderNumber}
 {order.isNew && <LlcNewBadge />}
 </div>
 <LlcStatusBadge status={order.status} />
 </div>

 {/* Row 2: Client Info */}
 <div className="text-xs text-[#111111] mb-3 font-inter">
 <p className="font-semibold text-sm">{order.clientName ?? '—'}</p>
 <p className="text-[#6b7280]">{order.clientEmail}</p>
 </div>

 {/* Divider */}
 <hr className="border-t border-[#f3f4f6] my-2" />

 {/* Row 3: LLC Name & formation info */}
 <div className="text-xs text-[#111111] my-3">
 <p className="font-bold text-sm text-[#34088f]">{order.llcName}</p>
 <p className="text-[#6b7280] mt-0.5">
 {order.formationState ?? '—'} &middot; {formatDate(order.submittedAt ?? order.createdAt)}
 </p>
 </div>

 {/* Pending amount if applicable */}
 {order.paymentStatus !== 'paid' && order.pendingAmount > 0 && (
 <>
 <hr className="border-t border-[#f3f4f6] my-2" />
 <div className="flex items-center justify-between mt-3 text-xs">
 <span className="text-[#6b7280] font-medium">Payment Due:</span>
 <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-bold bg-[#fff7ed] text-[#c2410c] border border-[#fed7aa]">
 {formatPKR(order.pendingAmount)}
 </span>
 </div>
 </>
 )}
 </div>
 );
}
