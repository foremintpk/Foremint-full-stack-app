'use client';

import React, { useMemo } from 'react';
import { User, MapPin, CreditCard } from 'lucide-react';
import type { OrderDetail } from '@/types/admin';
import type { BillingEntry } from '@/lib/admin/actions/addBillingEntry';

interface OverviewTabProps {
  order: OrderDetail;
  internalData: any;
  billingEntries: BillingEntry[];
}

function Card({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100">
        <div className="w-8 h-8 rounded-lg bg-[#34088f]/5 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-[#34088f]" />
        </div>
        <h3 className="text-base font-black text-gray-900 font-manrope">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500 font-inter">{label}</span>
      <span className="text-sm font-bold text-gray-900 font-inter text-right max-w-[60%] truncate">{value || '—'}</span>
    </div>
  );
}

function AmountRow({ label, value, highlight, strike, negative, positive }: {
  label: string; value: string; highlight?: boolean; strike?: boolean; negative?: boolean; positive?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-3 border-b border-gray-50 last:border-0 ${highlight ? 'pt-4 border-t-2 border-gray-200 mt-2' : ''}`}>
      <span className={`text-sm font-inter ${highlight ? 'font-bold text-gray-900' : 'text-gray-500'}`}>{label}</span>
      <span className={`font-manrope ${
        highlight  ? 'text-xl font-black text-[#34088f]' :
        strike     ? 'text-sm line-through text-gray-400' :
        negative   ? 'text-sm font-semibold text-emerald-600' :
        positive   ? 'text-sm font-semibold text-red-500' :
                     'text-sm font-semibold text-gray-900'
      }`}>
        {value}
      </span>
    </div>
  );
}

export function OverviewTab({ order, internalData: _internalData, billingEntries }: OverviewTabProps) {
  const snapshot = (order.formSnapshot as any) || {};
  const couponDiscount = Number(snapshot?.coupon?.discountAmount ?? snapshot?.step7?.coupon?.discountAmount ?? 0);
  const addonsTotal = order.addonsTotal ?? 0;

  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const { chargesTotal, discountsTotal, paymentsTotal, pendingAmount, isPaid } = useMemo(() => {
    let charges = 0, discounts = 0, payments = 0;
    for (const e of billingEntries) {
      if (e.type === 'charge') charges += e.amount;
      else if (e.type === 'discount') discounts += e.amount;
      else if (e.type === 'payment') payments += e.amount;
    }
    const effective = order.grandTotal + charges - discounts;
    const pending = Math.max(0, effective - payments);
    return { chargesTotal: charges, discountsTotal: discounts, paymentsTotal: payments, pendingAmount: pending, isPaid: pending <= 0 };
  }, [billingEntries, order.grandTotal]);

  const paymentBadge = isPaid
    ? { label: 'Paid', style: 'bg-emerald-100 text-emerald-700' }
    : { label: `Unpaid · ${fmt(pendingAmount)}`, style: 'bg-red-100 text-red-700' };

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

      {/* Payment Details — full width */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#34088f]/5 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-[#34088f]" />
              </div>
              <h3 className="text-base font-black text-gray-900 font-manrope">Payment Details</h3>
            </div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${paymentBadge.style}`}>
              {paymentBadge.label}
            </span>
          </div>

          <div className="p-5">
            {/* Base fees */}
            <AmountRow label="Package Fee"        value={fmt(order.packagePrice)} />
            <AmountRow label="Add-ons Total"      value={fmt(addonsTotal)} />
            <AmountRow label="State Fee"          value={fmt(order.stateFee)} />
            {couponDiscount > 0 && (
              <AmountRow label="Coupon Discount"  value={`-${fmt(couponDiscount)}`} strike />
            )}
            <AmountRow label="Base Total (USD)"   value={fmt(order.grandTotal)} highlight />

            {/* Billing entry adjustments */}
            {billingEntries.length > 0 && (
              <div className="mt-4 pt-4 border-t border-dashed border-gray-200">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 font-inter">Billing Adjustments</p>
                {billingEntries.map(e => (
                  <AmountRow
                    key={e.id}
                    label={e.title}
                    value={e.type === 'charge' ? `+${fmt(e.amount)}` : `-${fmt(e.amount)}`}
                    positive={e.type === 'charge'}
                    negative={e.type !== 'charge'}
                  />
                ))}
                {chargesTotal > 0 && (
                  <AmountRow label="Additional Charges" value={`+${fmt(chargesTotal)}`} positive />
                )}
                {discountsTotal > 0 && (
                  <AmountRow label="Applied Discounts"  value={`-${fmt(discountsTotal)}`} negative />
                )}
                {paymentsTotal > 0 && (
                  <AmountRow label="Payments Received"  value={`-${fmt(paymentsTotal)}`} negative />
                )}
              </div>
            )}

            {/* Pending amount — always shown */}
            <AmountRow
              label="Pending Amount"
              value={isPaid ? 'Paid in Full' : fmt(pendingAmount)}
              highlight
            />
          </div>
        </div>
      </div>
    </div>
  );
}
