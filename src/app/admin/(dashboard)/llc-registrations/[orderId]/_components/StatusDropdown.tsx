/**
 * @file src/app/admin/(dashboard)/llc-registrations/[orderId]/_components/StatusDropdown.tsx
 * @description Beautiful status dropdown with optimistic UI state transitions, loaders, and success ticks.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Check } from 'lucide-react';
import { updateOrderStatus } from '@/lib/admin/actions/updateOrderStatus';
import { OrderStatus } from '@/types/admin';
import { cn } from '@/lib/utils';

interface StatusDropdownProps {
 orderId: string;
 currentStatus: OrderStatus;
 adminId: string;
}

const STATUS_OPTIONS: { value: OrderStatus; label: string; colorClass: string }[] = [
 { value: 'pending', label: 'Pending', colorClass: 'bg-amber-100 text-amber-800 border-amber-200' },
 { value: 'processing', label: 'Processing', colorClass: 'bg-blue-100 text-blue-800 border-blue-200' },
 { value: 'formed', label: 'Formed', colorClass: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
];

export function StatusDropdown({
 orderId,
 currentStatus,
 adminId,
}: StatusDropdownProps): React.JSX.Element {
 const [status, setStatus] = useState<OrderStatus>(currentStatus);
 const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

 // Keep state synced with server value
 useEffect(() => {
 setStatus(currentStatus);
 }, [currentStatus]);

 const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
 const nextStatus = e.target.value as OrderStatus;
 const prevStatus = status;

 // Optimistic UI updates
 setStatus(nextStatus);
 setSavingState('saving');

 try {
 const res = await updateOrderStatus(orderId, nextStatus, adminId);
 if (res.success) {
 setSavingState('saved');
 setTimeout(() => setSavingState('idle'), 2000);
 } else {
 // Revert UI on failure
 setStatus(prevStatus);
 setSavingState('error');
 setTimeout(() => setSavingState('idle'), 3000);
 }
 } catch (err) {
 setStatus(prevStatus);
 setSavingState('error');
 setTimeout(() => setSavingState('idle'), 3000);
 }
 };

 const activeOption = STATUS_OPTIONS.find((o) => o.value === status) || STATUS_OPTIONS[0];

 return (
 <div className="flex items-center gap-2">
 <div className="relative flex items-center">
 {/* Status Dropdown Select Wrapper */}
 <select
 value={status}
 onChange={handleChange}
 disabled={savingState === 'saving'}
 aria-label="Order status"
 className={cn("appearance-none pr-10 pl-4 py-1.5 text-xs font-semibold rounded-full border cursor-pointer focus:outline-none transition-all duration-200", activeOption.colorClass, savingState === 'saving' && "opacity-50 cursor-not-allowed")}
 >
 {STATUS_OPTIONS.map((opt) => (
 <option key={opt.value} value={opt.value} className="bg-white text-black font-semibold">
 {opt.label}
 </option>
 ))}
 </select>

 {/* Dropdown Chevron Indicator */}
 <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5">
 <svg
 className="h-4 w-4"
 xmlns="http://www.w3.org/2000/svg"
 viewBox="0 0 20 20"
 fill="currentColor"
 aria-hidden="true"
 >
 <path
 fillRule="evenodd"
 d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
 clipRule="evenodd"
 />
 </svg>
 </div>
 </div>

 {/* State Badge Indicators */}
 {savingState === 'saving' && (
 <span className="flex items-center gap-1 text-[11px] font-semibold text-gray-500">
 <Loader2 className="w-3.5 h-3.5 animate-spin text-[#34088f]" />
 Saving...
 </span>
 )}

 {savingState === 'saved' && (
 <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 animate-fade-in">
 <Check className="w-3.5 h-3.5" />
 Saved ✓
 </span>
 )}

 {savingState === 'error' && (
 <span className="text-[11px] font-semibold text-red-600 animate-shake">
 Failed to save
 </span>
 )}
 </div>
 );
}
