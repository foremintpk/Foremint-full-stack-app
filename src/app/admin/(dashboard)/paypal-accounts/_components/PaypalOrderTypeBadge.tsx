import React from 'react';
import { PaypalOrderType } from '@/types/admin';

interface PaypalOrderTypeBadgeProps {
  type: PaypalOrderType;
}

export function PaypalOrderTypeBadge({ type }: PaypalOrderTypeBadgeProps) {
  let badgeClasses = '';

  switch (type) {
    case 'new':
      badgeClasses = 'bg-[#f4f0fe] text-[#34088f] border-[#e0d9f7]';
      break;
    case 'replacement':
      badgeClasses = 'bg-blue-50 text-blue-700 border-blue-200';
      break;
    default:
      badgeClasses = 'bg-gray-50 text-gray-700 border-gray-200';
  }

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize border ${badgeClasses}`}>
      {type}
    </span>
  );
}
