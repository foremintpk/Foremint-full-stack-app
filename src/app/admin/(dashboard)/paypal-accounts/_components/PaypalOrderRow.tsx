import React from 'react';
import { PaypalOrder, UserRole } from '@/types/admin';
import { PaypalOrderStatusBadge } from './PaypalOrderStatusBadge';
import { PaypalOrderTypeBadge } from './PaypalOrderTypeBadge';
import { PaypalOrderActionMenu } from './PaypalOrderActionMenu';
import { formatDate } from '@/lib/admin/formatters';

interface PaypalOrderRowProps {
  order: PaypalOrder;
  currentAdminRole: UserRole;
}

export function PaypalOrderRow({ order, currentAdminRole }: PaypalOrderRowProps) {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(order.dealAmount);

  return (
    <div
      role="row"
      className="grid grid-cols-[1.2fr_1.5fr_1fr_1fr_0.8fr_0.8fr_0.6fr] gap-4 px-6 py-4 bg-white border-b border-[#e0d9f7] hover:bg-gray-50/50 transition-all duration-150 items-center select-text font-inter"
    >
      {/* Customer Name */}
      <div role="cell" className="min-w-0">
        <p className="font-semibold text-gray-900 truncate font-manrope">
          {order.customerName}
        </p>
        {order.notes && (
          <p className="text-[10px] text-gray-400 truncate max-w-full font-inter" title={order.notes}>
            {order.notes}
          </p>
        )}
      </div>

      {/* Email */}
      <div role="cell" className="text-sm text-gray-500 truncate select-all pr-2">
        {order.email}
      </div>

      {/* Date */}
      <div role="cell" className="text-sm text-gray-950 font-medium">
        {formatDate(order.date)}
      </div>

      {/* Deal Amount */}
      <div role="cell" className="text-sm font-semibold text-gray-900 font-manrope">
        {formattedAmount}
      </div>

      {/* Type Badge */}
      <div role="cell">
        <PaypalOrderTypeBadge type={order.type} />
      </div>

      {/* Status Badge */}
      <div role="cell">
        <PaypalOrderStatusBadge status={order.status} />
      </div>

      {/* Action Menu */}
      <div role="cell" className="flex items-center justify-end">
        <PaypalOrderActionMenu
          order={order}
          currentAdminRole={currentAdminRole}
        />
      </div>
    </div>
  );
}
