'use client';

import React from 'react';
import { User, MapPin, Package, Users, DollarSign, CreditCard } from 'lucide-react';
import type { OrderDetail } from '@/types/admin';

interface OverviewTabProps {
  order: OrderDetail;
  internalData: any;
}

function Card({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100">
        <div className="w-8 h-8 rounded-lg bg-[#34088f]/5 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-[#34088f]" />
        </div>
        <h3 className="text-sm font-black text-gray-900 font-manrope">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500 font-inter">{label}</span>
      <span className="text-xs font-semibold text-gray-900 font-inter text-right max-w-[60%] truncate">{value || '—'}</span>
    </div>
  );
}

function AmountRow({ label, value, highlight, strike }: { label: string; value: string; highlight?: boolean; strike?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0 ${highlight ? 'pt-3 border-t border-gray-200 mt-1' : ''}`}>
      <span className={`text-xs font-inter ${highlight ? 'font-bold text-gray-900' : 'text-gray-500'}`}>{label}</span>
      <span className={`text-xs font-manrope ${highlight ? 'text-base font-black text-[#34088f]' : strike ? 'line-through text-gray-400' : 'font-semibold text-gray-900'}`}>
        {value}
      </span>
    </div>
  );
}

export function OverviewTab({ order, internalData }: OverviewTabProps) {
  const snapshot = (order.formSnapshot as any) || {};

  // Payment status logic
  const totalAmount = order.grandTotal;
  const billing = internalData?.billing;
  const advancePaid = billing?.advanceAmount ?? 0;
  const discountPkr = billing?.discountPkr ?? 0;
  const grandTotalPkr = billing?.grandTotalPkr ?? 0;
  const secondPayment = billing?.secondPaymentAmount ?? 0;

  // Coupon
  const coupon = snapshot?.coupon ?? snapshot?.step7?.coupon ?? null;
  const couponDiscount = Number(coupon?.discountAmount ?? 0);
  const addonsTotal = order.addonsTotal ?? 0;

  // Pending amount (USD)
  let paymentStatus: 'Paid' | 'Unpaid' | 'Partially Paid' = 'Unpaid';
  if (order.paymentStatus === 'paid') paymentStatus = 'Paid';
  else if (order.paymentStatus === 'partial') paymentStatus = 'Partially Paid';

  const paymentStatusStyles: Record<string, string> = {
    'Paid':           'bg-emerald-100 text-emerald-700',
    'Unpaid':         'bg-red-100 text-red-700',
    'Partially Paid': 'bg-amber-100 text-amber-700',
  };

  const usdFormatter = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Client Information */}
      <Card title="Client Information" icon={User}>
        <Row label="Client Name"  value={order.clientName} />
        <Row label="Email"        value={order.clientEmail} />
        <Row label="Phone"        value={order.clientPhone} />
        <Row label="Member Type"  value={order.memberType ?? snapshot?.memberType} />
        <Row label="Entity Type"  value={order.entityType ?? snapshot?.entityType} />
      </Card>

      {/* Formation Information */}
      <Card title="Formation Information" icon={MapPin}>
        <Row label="LLC Name"         value={order.llcName} />
        <Row label="Formation State"  value={order.formationStateName ?? order.formationState} />
        <Row label="Selected Package" value={order.formationPackageName ?? order.formationPackage} />
        <Row label="Order Number"     value={order.orderNumber} />
        <Row label="Submitted"        value={order.submittedAt ? new Date(order.submittedAt).toLocaleDateString() : undefined} />
      </Card>

      {/* Payment Summary — full width */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#34088f]/5 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-[#34088f]" />
              </div>
              <h3 className="text-sm font-black text-gray-900 font-manrope">Payment Details</h3>
            </div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${paymentStatusStyles[paymentStatus]}`}>
              {paymentStatus}
            </span>
          </div>

          <div className="p-5 max-w-md">
            <AmountRow label="Package Fee"          value={usdFormatter(order.packagePrice)} />
            <AmountRow label="Add-ons Total"        value={usdFormatter(addonsTotal)} />
            <AmountRow label="State Fee"            value={usdFormatter(order.stateFee)} />
            {couponDiscount > 0 && (
              <AmountRow label="Coupon Discount"    value={`-${usdFormatter(couponDiscount)}`} strike />
            )}
            {discountPkr > 0 && (
              <AmountRow label="Additional Discount" value={`Rs. ${discountPkr.toLocaleString()}`} strike />
            )}
            {advancePaid > 0 && (
              <AmountRow label="Advance Paid (PKR)" value={`Rs. ${advancePaid.toLocaleString()}`} />
            )}
            {secondPayment > 0 && (
              <AmountRow label="Second Payment"     value={`Rs. ${secondPayment.toLocaleString()}`} />
            )}
            <AmountRow label="Total Amount (USD)"  value={usdFormatter(totalAmount)} highlight />
            {grandTotalPkr > 0 && (
              <AmountRow label="Total Amount (PKR)" value={`Rs. ${grandTotalPkr.toLocaleString()}`} highlight />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
