'use client';

import React from 'react';
import { DollarSign } from 'lucide-react';
import type { OrderBilling } from '@/types/admin';

interface BillingSectionProps {
  orderId: string;
  adminId: string;
  initialBilling: OrderBilling;
}

export function BillingSection({ initialBilling }: BillingSectionProps): React.JSX.Element {
  return (
    <article
      aria-label="Billing summaries"
      className="bg-white border border-gray-100 rounded-2xl p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
    >
      <div className="flex items-center gap-2 border-b border-gray-100 pb-4 mb-6">
        <DollarSign className="w-5 h-5 text-[#34088f]" />
        <h4 className="text-sm font-bold font-manrope text-gray-900 uppercase tracking-wider">
          Order Billing
        </h4>
      </div>

      <div className="bg-gray-50/50 border border-gray-100 rounded-2xl p-5 space-y-4 font-inter">
        <h5 className="text-xs font-bold text-gray-800 uppercase tracking-wide border-b border-gray-100 pb-2 flex items-center gap-1">
          <DollarSign className="w-4 h-4 text-gray-500" />
          USD Aggregates (Computed)
        </h5>
        <div className="space-y-2.5 text-xs">
          <div className="flex items-center justify-between text-gray-600">
            <span>Package Price:</span>
            <span className="font-semibold text-gray-800">${initialBilling.packagePrice.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-gray-600">
            <span>State Renewal Fee:</span>
            <span className="font-semibold text-gray-800">${initialBilling.stateFee.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-gray-600">
            <span>Customer Addons:</span>
            <span className="font-semibold text-gray-800">${initialBilling.customerAddonsTotal.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-gray-600">
            <span>Internal Addons:</span>
            <span className="font-semibold text-gray-800">${initialBilling.internalAddonsTotal.toLocaleString()}</span>
          </div>
          <div className="border-t border-gray-100 pt-2.5 flex items-center justify-between font-bold text-[#34088f] text-sm font-manrope">
            <span>Grand Total (USD):</span>
            <span>${initialBilling.grandTotalUsd.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
