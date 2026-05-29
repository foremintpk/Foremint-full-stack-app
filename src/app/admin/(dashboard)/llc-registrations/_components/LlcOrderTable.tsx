/**
 * @file src/app/admin/(dashboard)/llc-registrations/_components/LlcOrderTable.tsx
 * @description Coordinates the layout between a full multi-column grid table for desktops and
 * stacked vertical cards for mobile. Uses capsule design system: rounded header bar + card rows.
 */

import React from 'react';
import { LlcOrderRow } from '@/types/admin';
import LlcOrderRowComponent from './LlcOrderRow';
import LlcOrderCardComponent from './LlcOrderCard';

interface LlcOrderTableProps {
 orders: LlcOrderRow[];
}

export default function LlcOrderTable({ orders }: LlcOrderTableProps): React.JSX.Element {
 return (
 <div className="w-full space-y-1.5">
 {/* Desktop & Tablet Table (>=768px) */}
 <div className="hidden md:block w-full">
 {/* Capsule Header Row — visually distinct from data rows */}
 <div className="grid grid-cols-[1fr_1.2fr_1.4fr_0.9fr_0.9fr_0.9fr] gap-0 px-6 py-2.5 bg-[#f4f0fe] rounded-2xl mb-2">
 <span className="text-[11px] font-bold text-[#6b7280] uppercase tracking-wider font-inter">Order</span>
 <span className="text-[11px] font-bold text-[#6b7280] uppercase tracking-wider font-inter">Client</span>
 <span className="text-[11px] font-bold text-[#6b7280] uppercase tracking-wider font-inter">LLC Name</span>
 <span className="text-[11px] font-bold text-[#6b7280] uppercase tracking-wider font-inter">Status</span>
 <span className="text-[11px] font-bold text-[#6b7280] uppercase tracking-wider font-inter">Date</span>
 <span className="text-[11px] font-bold text-[#6b7280] uppercase tracking-wider font-inter text-right">Pending Amt</span>
 </div>

 {/* Data rows rendered as a proper accessible table with no invalid nesting */}
 <div
 role="table"
 aria-label="LLC registrations list"
 className="w-full space-y-1.5"
 >
 <div role="rowgroup" className="space-y-1.5">
 {orders.map((order) => (
 <LlcOrderRowComponent key={order.id} order={order} />
 ))}
 </div>
 </div>
 </div>

 {/* Mobile Stacked Card View (<768px) */}
 <div className="flex flex-col gap-3 md:hidden">
 {orders.map((order) => (
 <LlcOrderCardComponent key={order.id} order={order} />
 ))}
 </div>
 </div>
 );
}
