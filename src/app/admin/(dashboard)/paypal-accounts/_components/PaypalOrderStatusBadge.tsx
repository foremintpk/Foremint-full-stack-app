import React from 'react';
import { PaypalOrderStatus } from '@/types/admin';

interface PaypalOrderStatusBadgeProps {
  status: PaypalOrderStatus;
}

export function PaypalOrderStatusBadge({ status }: PaypalOrderStatusBadgeProps) {
  let badgeClasses = '';
  let dotClasses = '';

  switch (status) {
    case 'pending':
      badgeClasses = 'bg-amber-50 text-amber-700 border-amber-200';
      dotClasses = 'bg-amber-500';
      break;
    case 'completed':
      badgeClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      dotClasses = 'bg-emerald-500';
      break;
    case 'suspended':
      badgeClasses = 'bg-orange-50 text-orange-700 border-orange-200';
      dotClasses = 'bg-orange-500';
      break;
    case 'failed':
      badgeClasses = 'bg-red-50 text-red-600 border-red-200';
      dotClasses = 'bg-red-500';
      break;
    default:
      badgeClasses = 'bg-gray-50 text-gray-700 border-gray-200';
      dotClasses = 'bg-gray-500';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize border ${badgeClasses}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotClasses}`} />
      {status}
    </span>
  );
}
