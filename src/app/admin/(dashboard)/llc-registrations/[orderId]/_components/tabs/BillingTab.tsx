'use client';

import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Loader2, Save, CreditCard, TrendingDown, TrendingUp, DollarSign, Pencil, X } from 'lucide-react';
import {
  addBillingEntry, updateBillingEntry, deleteBillingEntry,
  type BillingEntry, type BillingEntryType,
} from '@/lib/admin/actions/addBillingEntry';
import type { OrderDetail } from '@/types/admin';

interface BillingTabProps {
  order: OrderDetail;
  internalData: any;
  billingEntries: BillingEntry[];
  adminId: string;
  onEntryAdded: (entry: BillingEntry) => void;
  onEntryUpdated: (entry: BillingEntry) => void;
  onEntryRemoved: (id: string) => void;
  onBillingSaved: () => void;
}

function SummaryRow({
  label, value, highlight, negative, positive, muted,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  negative?: boolean;
  positive?: boolean;
  muted?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-3 border-b border-gray-50 last:border-0 ${highlight ? 'border-t-2 border-gray-200 mt-2 pt-4' : ''}`}>
      <span className={`text-sm font-inter ${highlight ? 'font-bold text-gray-900' : muted ? 'text-gray-400 italic' : 'text-gray-500'}`}>
        {label}
      </span>
      <span className={`font-manrope ${
        highlight   ? 'text-xl font-black text-[#34088f]' :
        negative    ? 'text-sm font-semibold text-emerald-600' :
        positive    ? 'text-sm font-semibold text-red-500' :
        muted       ? 'text-sm font-semibold text-gray-400' :
                      'text-sm font-semibold text-gray-900'
      }`}>
        {value}
      </span>
    </div>
  );
}

const TYPE_CONFIG: Record<BillingEntryType, { label: string; icon: React.ElementType; color: string; sign: string }> = {
  discount: { label: 'Discount',          icon: TrendingDown, color: 'text-emerald-600 bg-emerald-50', sign: '-' },
  charge:   { label: 'Additional Charge', icon: TrendingUp,   color: 'text-red-600 bg-red-50',         sign: '+' },
  payment:  { label: 'Payment',           icon: DollarSign,   color: 'text-blue-600 bg-blue-50',        sign: '-' },
};

const INPUT_CLS = 'block w-full h-9 px-3 bg-white border border-[#e5e7eb] rounded-full text-xs font-semibold font-inter outline-none focus:border-[#34088f] transition-all';
const SELECT_CLS = 'block w-full h-9 pl-3 pr-8 bg-white border border-[#e5e7eb] rounded-full text-xs font-semibold font-inter outline-none focus:border-[#34088f] transition-all appearance-none';

export function BillingTab({
  order, internalData: _internalData, billingEntries, adminId,
  onEntryAdded, onEntryUpdated, onEntryRemoved,
}: BillingTabProps) {
  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const couponDiscount = Number((order.formSnapshot as any)?.coupon?.discountAmount ?? 0);

  // ── Live computed pending (matches syncOrderPaymentStatus exactly) ──────────
  const { pendingAmount } = useMemo(() => {
    let charges = 0, discounts = 0, payments = 0;
    for (const e of billingEntries) {
      if (e.type === 'charge')   charges  += e.amount;
      else if (e.type === 'discount') discounts += e.amount;
      else if (e.type === 'payment')  payments  += e.amount;
    }
    const effective = order.grandTotal + charges - discounts;
    const pending   = Math.max(0, effective - payments);
    return { pendingAmount: pending };
  }, [billingEntries, order.grandTotal]);

  const isPaid = pendingAmount <= 0;
  const badgeLabel = isPaid ? 'Paid' : `Unpaid · ${fmt(pendingAmount)}`;
  const badgeStyle = isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700';

  // ── Add entry ──────────────────────────────────────────────────────────────
  const [showAdd, setShowAdd]       = useState(false);
  const [addTitle, setAddTitle]     = useState('');
  const [addAmount, setAddAmount]   = useState('');
  const [addType, setAddType]       = useState<BillingEntryType>('payment');
  const [adding, setAdding]         = useState(false);
  const [addError, setAddError]     = useState<string | null>(null);

  const handleAdd = async () => {
    const amount = parseFloat(addAmount);
    if (!addTitle.trim() || isNaN(amount) || amount <= 0) { setAddError('Enter a valid title and positive amount'); return; }
    setAdding(true); setAddError(null);
    const res = await addBillingEntry(order.id, adminId, addTitle.trim(), amount, addType);
    setAdding(false);
    if (res.success && res.entry) {
      onEntryAdded(res.entry);
      setAddTitle(''); setAddAmount(''); setAddType('payment'); setShowAdd(false);
    } else setAddError(res.error ?? 'Failed to add entry');
  };

  // ── Edit entry ─────────────────────────────────────────────────────────────
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editTitle, setEditTitle]   = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editType, setEditType]     = useState<BillingEntryType>('payment');
  const [saving, setSaving]         = useState(false);
  const [editError, setEditError]   = useState<string | null>(null);

  const startEdit = (entry: BillingEntry) => {
    setEditingId(entry.id);
    setEditTitle(entry.title);
    setEditAmount(String(entry.amount));
    setEditType(entry.type);
    setEditError(null);
  };

  const cancelEdit = () => { setEditingId(null); setEditError(null); };

  const handleSaveEdit = async () => {
    const amount = parseFloat(editAmount);
    if (!editTitle.trim() || isNaN(amount) || amount <= 0) { setEditError('Enter a valid title and positive amount'); return; }
    setSaving(true); setEditError(null);
    const res = await updateBillingEntry(editingId!, editTitle.trim(), amount, editType);
    setSaving(false);
    if (res.success && res.entry) { onEntryUpdated(res.entry); setEditingId(null); }
    else setEditError(res.error ?? 'Failed to update');
  };

  // ── Delete entry ───────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    await deleteBillingEntry(id);
    onEntryRemoved(id);
  };

  return (
    <div className="space-y-6">
      {/* ── Payment Summary ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#34088f]/5 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-[#34088f]" />
            </div>
            <h3 className="text-base font-black text-gray-900 font-manrope">Payment Summary</h3>
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${badgeStyle}`}>
            {badgeLabel}
          </span>
        </div>

        <div className="p-5">
          {/* Base order fees */}
          <SummaryRow label="Package Fee"   value={fmt(order.packagePrice)} />
          <SummaryRow label="Add-ons Total" value={fmt(order.addonsTotal)} />
          <SummaryRow label="State Fee"     value={fmt(order.stateFee)} />
          {couponDiscount > 0 && (
            <SummaryRow label="Coupon Discount" value={`-${fmt(couponDiscount)}`} negative />
          )}
          <SummaryRow label="Base Total (USD)" value={fmt(order.grandTotal)} highlight />

          {/* Billing entry adjustments — one row per entry (no duplicate aggregates) */}
          {billingEntries.length > 0 && (
            <div className="mt-4 pt-4 border-t border-dashed border-gray-200 space-y-0">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 font-inter">Billing Adjustments</p>
              {billingEntries.map(e => (
                <SummaryRow
                  key={e.id}
                  label={`${e.title} · ${e.type === 'charge' ? 'Charge' : e.type === 'discount' ? 'Discount' : 'Payment'}`}
                  value={e.type === 'charge' ? `+${fmt(e.amount)}` : `-${fmt(e.amount)}`}
                  positive={e.type === 'charge'}
                  negative={e.type !== 'charge'}
                />
              ))}
            </div>
          )}

          {/* Pending amount */}
          <SummaryRow
            label="Pending Amount"
            value={isPaid ? 'Paid in Full' : fmt(pendingAmount)}
            highlight
          />
        </div>
      </div>

      {/* ── Billing History ──────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-gray-900 font-manrope">Billing History</h3>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#34088f] text-white rounded-full text-xs font-bold hover:bg-[#2d077c] transition-all font-manrope"
          >
            <Plus className="w-3.5 h-3.5" /> Add Billing Entry
          </button>
        </div>

        {/* Add form */}
        {showAdd && (
          <div className="bg-white rounded-2xl border border-[#34088f]/20 shadow-sm p-5 mb-4">
            <p className="text-sm font-black text-gray-900 font-manrope mb-4">New Billing Entry</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-inter mb-1 block">Type</label>
                <div className="relative">
                  <select className={SELECT_CLS} value={addType} onChange={e => setAddType(e.target.value as BillingEntryType)}>
                    <option value="payment">Payment</option>
                    <option value="discount">Discount</option>
                    <option value="charge">Additional Charge</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-inter mb-1 block">Title</label>
                <input className={INPUT_CLS} value={addTitle} onChange={e => setAddTitle(e.target.value)} placeholder="e.g. Advance Payment" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-inter mb-1 block">Amount (USD)</label>
                <input className={INPUT_CLS} type="number" min="0" step="0.01" value={addAmount} onChange={e => setAddAmount(e.target.value)} placeholder="0.00" />
              </div>
            </div>
            {addError && <p className="text-xs text-red-600 font-semibold mb-3 font-inter">{addError}</p>}
            <div className="flex items-center gap-2">
              <button onClick={handleAdd} disabled={adding}
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
              const cfg = TYPE_CONFIG[entry.type];
              const Icon = cfg.icon;
              const isEditing = editingId === entry.id;

              return (
                <div key={entry.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  {isEditing ? (
                    /* ── Inline edit form ── */
                    <div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-inter mb-1 block">Type</label>
                          <div className="relative">
                            <select className={SELECT_CLS} value={editType} onChange={e => setEditType(e.target.value as BillingEntryType)}>
                              <option value="payment">Payment</option>
                              <option value="discount">Discount</option>
                              <option value="charge">Additional Charge</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-inter mb-1 block">Title</label>
                          <input className={INPUT_CLS} value={editTitle} onChange={e => setEditTitle(e.target.value)} />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-inter mb-1 block">Amount (USD)</label>
                          <input className={INPUT_CLS} type="number" min="0" step="0.01" value={editAmount} onChange={e => setEditAmount(e.target.value)} />
                        </div>
                      </div>
                      {editError && <p className="text-xs text-red-600 font-semibold mb-2 font-inter">{editError}</p>}
                      <div className="flex items-center gap-2">
                        <button onClick={handleSaveEdit} disabled={saving}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#34088f] text-white rounded-full text-xs font-bold hover:bg-[#2d077c] disabled:opacity-50 transition-all font-manrope">
                          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
                        </button>
                        <button onClick={cancelEdit}
                          className="flex items-center gap-1 px-3 py-1.5 border border-[#e5e7eb] rounded-full text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all font-manrope">
                          <X className="w-3 h-3" /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ── Read view ── */
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-900 font-manrope">{entry.title}</p>
                        <p className="text-[10px] text-gray-400 font-inter">
                          {cfg.label} · {new Date(entry.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`text-sm font-black font-manrope ${entry.type === 'charge' ? 'text-red-500' : 'text-emerald-600'}`}>
                        {cfg.sign}${entry.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                      <button onClick={() => startEdit(entry)}
                        className="p-1.5 rounded-lg hover:bg-[#34088f]/10 text-gray-300 hover:text-[#34088f] transition-colors"
                        title="Edit">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(entry.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                        title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
