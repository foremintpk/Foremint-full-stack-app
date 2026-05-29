import React from 'react';
import { ShoppingBag } from 'lucide-react';

interface PaypalOrderEmptyStateProps {
  filtered?: boolean;
}

export function PaypalOrderEmptyState({ filtered = false }: PaypalOrderEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#e0d9f7] bg-white p-12 text-center shadow-[0_1px_4px_rgba(52,8,143,0.06)]">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f4f0fe] text-[#34088f] mb-4">
        <ShoppingBag className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 font-manrope">
        {filtered ? 'No orders match your filters' : 'No PayPal orders yet'}
      </h3>
      <p className="mt-1 text-sm text-gray-500 font-inter">
        {filtered
          ? 'Try adjusting your search query or filter options.'
          : 'Create a new PayPal order tracking entry to get started.'}
      </p>
    </div>
  );
}
