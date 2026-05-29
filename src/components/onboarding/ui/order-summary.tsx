import React from 'react';
import { cn } from '@/lib/utils';

interface LineItem {
  label: string;
  amount: number;
  isSubtotal?: boolean;
}

interface OrderSummaryProps {
  lineItems: LineItem[];
  total: number;
  className?: string;
}

export function OrderSummary({ lineItems, total, className }: OrderSummaryProps) {
  return (
    <div className={cn("bg-gray-50 border border-gray-100 p-8 rounded-sm space-y-6", className)}>
      <h3 className="text-[14px] font-black uppercase tracking-widest text-black font-manrope">Order Summary</h3>
      <div className="space-y-4">
        {lineItems.map((item, idx) => (
          <div key={idx} className={cn(
            "flex justify-between text-[14px] font-medium text-gray-600",
            item.isSubtotal ? "pt-4 border-t border-gray-200 text-black font-bold" : ""
          )}>
            <span className="font-inter">{item.label}</span>
            <span className="font-inter tabular-nums">${item.amount.toFixed(2)}</span>
          </div>
        ))}
        <div className="pt-6 border-t border-gray-200 flex justify-between items-end">
          <span className="text-[16px] font-black uppercase tracking-tight text-black font-manrope">Total</span>
          <div className="text-right">
            <span className="text-[24px] font-black text-[#34088f] font-inter tabular-nums tracking-tighter">
              ${total.toFixed(2)}
            </span>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">One-time payment</p>
          </div>
        </div>
      </div>
    </div>
  );
}
