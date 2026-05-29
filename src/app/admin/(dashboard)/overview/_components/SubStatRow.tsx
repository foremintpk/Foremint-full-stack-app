/**
 * @file src/app/admin/(dashboard)/overview/_components/SubStatRow.tsx
 * @description Beautiful, accessible row representing sub-states in an article card.
 * 
 * 1. Server vs Client choice rationale: Server Component by default (no dynamic state needed).
 * 2. Caching layer: N/A.
 * 3. RBAC: N/A.
 * 4. Revalidation / Cache Busting: N/A.
 */

import React from 'react';
import { STATUS_COLORS, StatusKey } from '@/lib/admin/statusColors';

interface SubStatRowProps {
 label: string;
 value: number;
 statusKey: StatusKey;
}

export function SubStatRow({ label, value, statusKey }: SubStatRowProps) {
 const dotColor = STATUS_COLORS[statusKey] || '#6b7280';

 return (
 <div className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50 last:border-0">
 <div className="flex items-center gap-2">
 {/* Dynamic status colored circle indicator */}
 <span
 className="w-1.5 h-1.5 rounded-full flex-shrink-0"
 style={{ backgroundColor: dotColor }}
 aria-hidden="true"
 />
 <span
 className="text-gray-500 font-medium font-inter capitalize"
 >
 {label}
 </span>
 </div>

 <span
 className="text-[#111111] font-bold font-inter"
 >
 {value}
 </span>
 </div>
 );
}
