'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { updateOrderStatus } from '@/lib/admin/actions/updateOrderStatus';
import {
  GROUP_LABELS,
  getSelectableStatuses,
  getStatusDisplay,
  type OrderStatusGroup,
  type OrderStatusKey,
} from '@/lib/orders/orderStatus';
import { cn } from '@/lib/utils';

interface StatusDropdownProps {
  orderId: string;
  currentStatus: OrderStatusKey;
  adminId: string;
  /** ITIN statuses are offered only for orders that bought the ITIN add-on. */
  hasItinAddon: boolean;
}

export function StatusDropdown({ orderId, currentStatus, adminId, hasItinAddon }: StatusDropdownProps): React.JSX.Element {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatusKey>(currentStatus);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    setStatus(currentStatus);
  }, [currentStatus]);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextStatus = e.target.value as OrderStatusKey;
    const prevStatus = status;

    setStatus(nextStatus);
    setSavingState('saving');

    try {
      const res = await updateOrderStatus(orderId, nextStatus, adminId);
      if (res.success) {
        setSavingState('saved');
        // Sync the order detail page with the freshly-saved status
        router.refresh();
        setTimeout(() => setSavingState('idle'), 2000);
      } else {
        setStatus(prevStatus);
        setSavingState('error');
        setTimeout(() => setSavingState('idle'), 3000);
      }
    } catch {
      setStatus(prevStatus);
      setSavingState('error');
      setTimeout(() => setSavingState('idle'), 3000);
    }
  };

  const options = getSelectableStatuses({ hasItin: hasItinAddon, current: status });
  const groups = (['formation', 'itin'] as OrderStatusGroup[])
    .map((group) => ({ group, items: options.filter((o) => o.group === group) }))
    .filter((g) => g.items.length > 0);

  // `cancelled` is not selectable, but an order that is cancelled must still
  // read as cancelled here rather than falling back to the first option.
  const isCancelled = status === 'cancelled';
  const { style: toneStyle } = getStatusDisplay(status);

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex items-center">
        <select
          value={status}
          onChange={handleChange}
          disabled={savingState === 'saving'}
          aria-label="Order status"
          style={
            toneStyle
              ? { backgroundColor: toneStyle.bg, color: toneStyle.text, borderColor: toneStyle.border }
              : undefined
          }
          className={cn(
            'appearance-none pr-10 pl-4 py-1.5 text-xs font-semibold rounded-full border cursor-pointer focus:outline-none transition-all duration-200',
            savingState === 'saving' && 'opacity-50 cursor-not-allowed'
          )}
        >
          {isCancelled && (
            <option value="cancelled" disabled className="bg-white text-black font-semibold">
              Cancelled
            </option>
          )}
          {groups.map(({ group, items }) => {
            const rendered = items.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-white text-black font-semibold">
                {opt.label}
              </option>
            ));
            // The group headings only help when there is more than one group.
            return groups.length > 1 ? (
              <optgroup key={group} label={GROUP_LABELS[group]}>
                {rendered}
              </optgroup>
            ) : (
              <React.Fragment key={group}>{rendered}</React.Fragment>
            );
          })}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5">
          <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      </div>

      {savingState === 'saving' && (
        <span className="flex items-center gap-1 text-[11px] font-semibold text-gray-500">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#34088f]" /> Saving...
        </span>
      )}
      {savingState === 'saved' && (
        <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
          <Check className="w-3.5 h-3.5" /> Saved
        </span>
      )}
      {savingState === 'error' && (
        <span className="flex items-center gap-1 text-[11px] font-semibold text-red-600">
          <AlertCircle className="w-3.5 h-3.5" /> Failed
        </span>
      )}
    </div>
  );
}