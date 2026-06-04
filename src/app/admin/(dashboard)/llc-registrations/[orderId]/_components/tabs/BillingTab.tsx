'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Loader2, Save, X, CreditCard, TrendingDown, TrendingUp, DollarSign } from 'lucide-react';
import { addBillingEntry, deleteBillingEntry, type BillingEntry, type BillingEntryType } from '@/lib/admin/actions/addBillingEntry';
import { updateOrderBilling } from '@/lib/admin/actions/updateOrderBilling';
import type { OrderDetail } from '@/types/admin';

interface BillingTabProps {
  order: OrderDetail;
  internalData: any;
  billingEntries: BillingEntry[];
  adminId: string;
  onEntryAdded: (entry: BillingEntry) => void;
  onEntryRemoved: (id: string) => void;
  onBillingSaved: () => void;
}

function AmountRow({ label, value, highlight, negative }: { label: string; value: string; highlight?: boolean; negative?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0 ${highlight ? 'border-t-2 border-gray-200 mt-1 pt-3' : ''}`}>
      <span className={`text-xs font-inter ${highlight ? 'font-bold text-gray-900' : 'text-gray-500'}`}>{label}</span>
      <span className={`text-xs font-manrope ${highlight ? 'text-sm font-black text-[#34088f]' : negative ? 'font-semibold text-emerald-600' : 'font-semibold text-gray-900'}`}>
        {value}
      </span>
    </div>
  );
}

const ENTRY_TYPE_CONFIG: Record<BillingEntryType, { label: string; icon: React.ElementType; color: string; sign: string }> = {
  discount: { label: 'Discount',          icon: TrendingDown, color: 'text-emerald-600 bg-emerald-50', sign: '-' },
  charge:   { label: 'Additional Charge', icon: TrendingUp,   color: 'text-red-600 bg-red-50',         sign: '+' },
  payment:  { label: 'Payment',           icon: DollarSign,   color: 'text-blue-600 bg-blue-50',        sign: '-' },
};

export function BillingTab({
  order, internalData, billingEntries, adminId,
  onEntryAdded, onEntryRemoved, onBillingSaved,
}: BillingTabProps) {
  const billing = internalData?.billing;

  // ── Payment summary ────────────────────────────────────────────────────────
  const totalUsd = order.grandTotal;
  const couponDiscount = Number((order.formSnapshot as any)?.coupon?.discountAmount ?? 0);
  const paymentStatusStyles: Record<string, string> = {
    paid:    'bg-emerald-100 text-emerald-700',
    unpaid:  'bg-red-100 text-red-700',
    partial: 'bg-amber-100 text-amber-700',
  };

  // ── Add entry ──────────────────────────────────────────────────────────────
  const [showAdd, setShowAdd] = useState(false);
  const [entryTitle, setEntryTitle] = useState('');
  const [entryAmount, setEntryAmount] = useState('');
  const [entryType, setEntryType] = useState<BillingEntryType>('payment');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const handleAddEntry = async () => {
    const amount = parseFloat(entryAmount);
    if (!entryTitle.trim() || isNaN(amount) || amount <= 0) {
      setAddError('Enter a valid title and positive amount'); return;
    }
    setAdding(true); setAddError(null);
    const res = await addBillingEntry(order.id, adminId, entryTitle.trim(), amount, entryType);
    setAdding(false);
    if (res.success && res.entry) {
      onEntryAdded(res.entry);
      setEntryTitle(''); setEntryAmount(''); setEntryType('payment');
      setShowAdd(false);
    } else setAddError(res.error ?? 'Failed to add entry');
  };

  const handleDeleteEntry = async (id: string) => {
    await deleteBillingEntry(id);
    onEntryRemoved(id);
  };

  // ── PKR overrides ──────────────────────────────────────────────────────────
  const [editPkr, setEditPkr] = useState(false);
  const [savingPkr, setSavingPkr] = useState(false);
  const [pkrError, setPkrError] = useState<string | null>(null);
  const [grandTotalPkr, setGrandTotalPkr] = useState(billing?.grandTotalPkr != null ? String(billing.grandTotalPkr) : '');
  const [discountPkr, setDiscountPkr] = useState(billing?.discountPkr != null ? String(billing.discountPkr) : '');
  const [advanceAmount, setAdvanceAmount] = useState(billing?.advanceAmount != null ? String(billing.advanceAmount) : '');
  const [advanceDate, setAdvanceDate] = useState(billing?.advancePaymentDate ?? '');
  const [secondPayment, setSecondPayment] = useState(billing?.secondPaymentAmount != null ? String(billing.secondPaymentAmount) : '');

  const handleSavePkr = async () => {
    setSavingPkr(true); setPkrError(null);
    const res = await updateOrderBilling(order.id, adminId, {
      grandTotalPkr: grandTotalPkr ? Number(grandTotalPkr) : null,
      discountPkr:   discountPkr   ? Number(discountPkr)   : null,
      advanceAmount: advanceAmount ? Number(advanceAmount) : null,
      advancePaymentDate: advanceDate || null,
      secondPaymentAmount: secondPayment ? Number(secondPayment) : null,
    });
    setSavingPkr(false);
    if (res.success) { setEditPkr(false); onBillingSaved(); }
    else setPkrError(res.error ?? 'Save failed');
  };

  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const fmtPkr = (n: number | null) => n != null ? `Rs. ${Number(n).toLocaleString()}` : '—';

  const INPUT_CLS = 'block w-full h-10 px-4 bg-white border border-[#e5e7eb] rounded-full text-xs font-semibold font-inter outline-none focus:border-[#34088f] transition-all';
  const SELECT_CLS = 'block w-full h-10 pl-4 pr-10 bg-white border border-[#e5e7eb] rounded-full text-xs font-semibold font-inter outline-none focus:border-[#34088f] transition-all appearance-none';

  return (
    <div className="space-y-6">
      {/* ── Payment Summary ──────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#34088f]/5 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-[#34088f]" />
            </div>
            <h3 className="text-sm font-black text-gray-900 font-manrope">Payment Summary</h3>
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${paymentStatusStyles[order.paymentStatus ?? 'unpaid']}`}>
            {order.paymentStatus ?? 'Unpaid'}
          </span>
        </div>
        <div className="p-5 max-w-sm">
          <AmountRow label="Package Fee"    value={fmt(order.packagePrice)} />
          <AmountRow label="Add-ons Total"  value={fmt(order.addonsTotal)} />
          <AmountRow label="State Fee"      value={fmt(order.stateFee)} />
          {couponDiscount > 0 && <AmountRow label="Coupon Discount" value={`-${fmt(couponDiscount)}`} negative />}
          <AmountRow label="Total (USD)"    value={fmt(totalUsd)} highlight />
          {billing?.grandTotalPkr != null && (
            <AmountRow label="Total (PKR)" value={fmtPkr(billing.grandTotalPkr)} highlight />
          )}
          {billing?.advanceAmount != null && (
            <AmountRow label="Advance Paid (PKR)" value={fmtPkr(billing.advanceAmount)} negative />
          )}
          {billing?.discountPkr != null && billing.discountPkr > 0 && (
            <AmountRow label="Discount (PKR)" value={`-${fmtPkr(billing.discountPkr)}`} negative />
          )}
          {billing?.secondPaymentAmount != null && (
            <AmountRow label="Second Payment (PKR)" value={fmtPkr(billing.secondPaymentAmount)} />
          )}
        </div>
      </div>

      {/* ── Billing Entries ──────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-gray-900 font-manrope">Billing History</h3>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#34088f] text-white rounded-full text-xs font-bold hover:bg-[#2d077c] transition-all font-manrope">
            <Plus className="w-3.5 h-3.5" /> Add Billing Entry
          </button>
        </div>

        {/* Add form */}
        {showAdd && (
          <div className="bg-white rounded-2xl border border-[#34088f]/20 shadow-sm p-5 mb-4">
            <p className="text-sm font-black text-gray-900 font-manrope mb-4">New Billing Entry</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div className="sm:col-span-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-inter mb-1 block">Type</label>
                <div className="relative">
                  <select className={SELECT_CLS} value={entryType} onChange={e => setEntryType(e.target.value as BillingEntryType)}>
                    <option value="payment">Payment</option>
                    <option value="discount">Discount</option>
                    <option value="charge">Additional Charge</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-inter mb-1 block">Title</label>
                <input className={INPUT_CLS} value={entryTitle} onChange={e => setEntryTitle(e.target.value)} placeholder="e.g. Advance Payment" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-inter mb-1 block">Amount</label>
                <input className={INPUT_CLS} type="number" min="0" step="0.01" value={entryAmount} onChange={e => setEntryAmount(e.target.value)} placeholder="0.00" />
              </div>
            </div>
            {addError && <p className="text-xs text-red-600 font-semibold mb-3 font-inter">{addError}</p>}
            <div className="flex items-center gap-2">
              <button onClick={handleAddEntry} disabled={adding}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#34088f] text-white rounded-full text-xs font-bold hover:bg-[#2d077c] disabled:opacity-50 transition-all font-manrope">
                {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save Entry
              </button>
              <button onClick={() => { setShowAdd(false); setAddError(null); }}
                className="px-4 py-2 border border-[#e5e7eb] rounded-full text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all font-manrope">
                Cancel
              </button>
            </div>
          </div>
        )}

        {billingEntries.length === 0 ? (
          <div className="text-center py-8 text-xs text-gray-400 font-inter bg-white rounded-2xl border border-gray-100">
            No billing entries yet. Add payments, discounts, or charges above.
          </div>
        ) : (
          <div className="space-y-2">
            {billingEntries.map(entry => {
              const cfg = ENTRY_TYPE_CONFIG[entry.type];
              const Icon = cfg.icon;
              return (
                <div key={entry.id} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-900 font-manrope">{entry.title}</p>
                    <p className="text-[10px] text-gray-400 font-inter">
                      {cfg.label} · {new Date(entry.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`text-sm font-black font-manrope ${entry.type === 'charge' ? 'text-red-600' : 'text-emerald-600'}`}>
                    {cfg.sign}${entry.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                  <button onClick={() => handleDeleteEntry(entry.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── PKR Overrides ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-black text-gray-900 font-manrope">PKR Override Settings</h3>
          {!editPkr ? (
            <button onClick={() => setEditPkr(true)}
              className="flex items-center gap-1.5 px-4 py-2 border border-[#e5e7eb] rounded-full text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all font-manrope">
              Edit
            </button>
          ) : (
            <div className="flex items-center gap-2">
              {pkrError && <span className="text-xs text-red-600 font-semibold font-inter">{pkrError}</span>}
              <button onClick={handleSavePkr} disabled={savingPkr}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#34088f] text-white rounded-full text-xs font-bold hover:bg-[#2d077c] disabled:opacity-50 transition-all font-manrope">
                {savingPkr ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
              </button>
              <button onClick={() => { setEditPkr(false); setPkrError(null); }}
                className="px-4 py-2 border border-[#e5e7eb] rounded-full text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all font-manrope">
                Cancel
              </button>
            </div>
          )}
        </div>
        <div className="p-5">
          {!editPkr ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
              {[
                { label: 'Grand Total (PKR)',  value: fmtPkr(billing?.grandTotalPkr) },
                { label: 'Discount (PKR)',     value: fmtPkr(billing?.discountPkr) },
                { label: 'Advance Amount',     value: fmtPkr(billing?.advanceAmount) },
                { label: 'Advance Date',       value: billing?.advancePaymentDate ?? '—' },
                { label: 'Second Payment',     value: fmtPkr(billing?.secondPaymentAmount) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-inter">{label}</p>
                  <p className="text-sm font-semibold text-gray-900 font-inter mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-inter mb-1 block">Grand Total (PKR)</label>
                <input className={INPUT_CLS} type="number" value={grandTotalPkr} onChange={e => setGrandTotalPkr(e.target.value)} /></div>
              <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-inter mb-1 block">Discount (PKR)</label>
                <input className={INPUT_CLS} type="number" value={discountPkr} onChange={e => setDiscountPkr(e.target.value)} /></div>
              <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-inter mb-1 block">Advance Amount</label>
                <input className={INPUT_CLS} type="number" value={advanceAmount} onChange={e => setAdvanceAmount(e.target.value)} /></div>
              <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-inter mb-1 block">Advance Date</label>
                <input className={INPUT_CLS} type="date" value={advanceDate} onChange={e => setAdvanceDate(e.target.value)} /></div>
              <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-inter mb-1 block">Second Payment</label>
                <input className={INPUT_CLS} type="number" value={secondPayment} onChange={e => setSecondPayment(e.target.value)} /></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
