/**
 * @file src/app/admin/(dashboard)/llc-registrations/[orderId]/_components/OrderDetailHeader.tsx
 * @description Operational detail header with scroll preservation back button, order titles, and status selectors.
 */

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { formatDate } from '@/lib/admin/formatters';
import { StatusDropdown } from './StatusDropdown';
import LlcNewBadge from '../../_components/LlcNewBadge';
import type { OrderDetail } from '@/types/admin';

interface OrderDetailHeaderProps {
 order: OrderDetail;
 adminId: string;
 isNew: boolean;
}

export function OrderDetailHeader({
 order,
 adminId,
 isNew,
}: OrderDetailHeaderProps): React.JSX.Element {
 return (
 <div className="bg-white border border-[#e0d9f7] rounded-2xl p-6 shadow-[0_1px_4px_rgba(52,8,143,0.06)]">
 <div className="flex flex-col gap-4">
 {/* Back navigation button with strict scroll preservation */}
 <div>
 <Link
 href="/admin/llc-registrations"
 scroll={false}
 className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-black transition-colors"
 >
 <ArrowLeft className="w-3.5 h-3.5" />
 Back to LLC Registrations
 </Link>
 </div>

 {/* Title, Details and Actions Row */}
 <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 border-t border-gray-100 pt-4">
 <div className="space-y-1.5 min-w-0">
 {/* Order Number & NEW Badge */}
 <div className="flex items-center gap-2">
 <span className="text-xs font-bold font-inter text-[#34088f] uppercase tracking-wider">
 Order #{order.orderNumber}
 </span>
 {isNew && <LlcNewBadge />}
 </div>

 {/* LLC Business Name */}
 <h2 className="text-xl md:text-2xl font-bold font-manrope text-black truncate leading-tight">
 {order.llcName}
 </h2>

 {/* Metadata (Date + User profiles) */}
 <div className="text-xs font-medium text-gray-500 font-inter leading-relaxed flex flex-wrap items-center gap-x-2 gap-y-1">
 <span>
 Submitted {formatDate(order.submittedAt || order.createdAt)}
 </span>
 <span className="text-gray-300">•</span>
 <span>
 Client:{' '}
 <strong className="text-gray-700 font-semibold">
 {order.clientName}
 </strong>{' '}
 ({order.clientEmail})
 </span>
 </div>
 </div>

 {/* Right Status Actions Panel */}
 <div className="flex items-center gap-3 bg-gray-50/50 p-3 rounded-2xl border border-[#e0d9f7] self-start lg:self-center">
 <span className="text-[11px] font-bold font-inter text-gray-400 uppercase tracking-wider">
 Order Status
 </span>
 <StatusDropdown
 orderId={order.id}
 currentStatus={order.status}
 adminId={adminId}
 />
 </div>
 </div>
 </div>
 </div>
 );
}
