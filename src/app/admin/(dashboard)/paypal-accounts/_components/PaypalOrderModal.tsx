'use client';

import React, { useState, useTransition } from 'react';
import { createPaypalOrder, updatePaypalOrder } from '@/lib/admin/actions/paypalOrderActions';
import { PaypalOrder, PaypalOrderStatus, PaypalOrderType } from '@/types/admin';
import { X, Loader2 } from 'lucide-react';

interface PaypalOrderModalProps {
  mode: 'create' | 'edit';
  order?: PaypalOrder;
  onClose: () => void;
}

export function PaypalOrderModal({ mode, order, onClose }: PaypalOrderModalProps) {
  const [customerName, setCustomerName] = useState(order?.customerName || '');
  const [email, setEmail] = useState(order?.email || '');
  const [date, setDate] = useState(order?.date || new Date().toISOString().split('T')[0]);
  const [dealAmount, setDealAmount] = useState(order?.dealAmount !== undefined ? String(order.dealAmount) : '');
  const [type, setType] = useState<PaypalOrderType>(order?.type || 'new');
  const [status, setStatus] = useState<PaypalOrderStatus>(order?.status || 'pending');
  const [notes, setNotes] = useState(order?.notes || '');
  
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!customerName.trim()) {
      setError('Customer name is required.');
      return;
    }
    if (!email.trim()) {
      setError('Email address is required.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!date) {
      setError('Date is required.');
      return;
    }
    if (!dealAmount || isNaN(Number(dealAmount)) || Number(dealAmount) < 0) {
      setError('Please enter a valid deal amount >= 0.');
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append('customerName', customerName.trim());
      formData.append('email', email.trim());
      formData.append('date', date);
      formData.append('dealAmount', dealAmount);
      formData.append('type', type);
      formData.append('status', status);
      formData.append('notes', notes.trim() || '');

      let res;
      if (mode === 'create') {
        res = await createPaypalOrder(formData);
      } else {
        res = await updatePaypalOrder(order!.id, formData);
      }

      if (res && res.error) {
        setError(res.error);
      } else {
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-[#e0d9f7] shadow-xl overflow-hidden font-inter">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e0d9f7] bg-[#f4f0fe] rounded-t-2xl">
          <h3 className="text-base font-bold text-gray-900 font-manrope">
            {mode === 'create' ? 'Create PayPal Order' : 'Edit PayPal Order'}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 font-inter">
          {error && (
            <div className="p-3 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl">
              {error}
            </div>
          )}

          {/* Customer Name */}
          <div className="space-y-1.5">
            <label htmlFor="paypal-customerName" className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Customer Name
            </label>
            <input
              id="paypal-customerName"
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              disabled={isPending}
              placeholder="e.g. Jane Doe"
              className="block w-full h-10 px-4 border border-[#e0d9f7] rounded-full text-sm text-[#111111] placeholder-[#9ca3af] outline-none focus:border-[#34088f] focus:ring-2 focus:ring-[#34088f]/20 transition-all font-inter"
              required
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="paypal-email" className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Email Address
            </label>
            <input
              id="paypal-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isPending}
              placeholder="e.g. jane@example.com"
              className="block w-full h-10 px-4 border border-[#e0d9f7] rounded-full text-sm text-[#111111] placeholder-[#9ca3af] outline-none focus:border-[#34088f] focus:ring-2 focus:ring-[#34088f]/20 transition-all font-inter"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date */}
            <div className="space-y-1.5">
              <label htmlFor="paypal-date" className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Date
              </label>
              <input
                id="paypal-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={isPending}
                className="block w-full h-10 px-4 border border-[#e0d9f7] rounded-full text-sm text-[#111111] outline-none focus:border-[#34088f] focus:ring-2 focus:ring-[#34088f]/20 transition-all font-inter"
                required
              />
            </div>

            {/* Deal Amount */}
            <div className="space-y-1.5">
              <label htmlFor="paypal-dealAmount" className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Deal Amount
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 text-sm">
                  $
                </span>
                <input
                  id="paypal-dealAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={dealAmount}
                  onChange={(e) => setDealAmount(e.target.value)}
                  disabled={isPending}
                  placeholder="0.00"
                  className="block w-full h-10 pl-8 pr-4 border border-[#e0d9f7] rounded-full text-sm text-[#111111] placeholder-[#9ca3af] outline-none focus:border-[#34088f] focus:ring-2 focus:ring-[#34088f]/20 transition-all font-inter"
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Type */}
            <div className="space-y-1.5">
              <label htmlFor="paypal-type" className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Type
              </label>
              <div className="relative">
                <select
                  id="paypal-type"
                  value={type}
                  onChange={(e) => setType(e.target.value as PaypalOrderType)}
                  disabled={isPending}
                  className="appearance-none w-full h-10 pl-4 pr-10 bg-white border border-[#e0d9f7] rounded-full text-sm text-gray-700 cursor-pointer outline-none focus:border-[#34088f] focus:ring-2 focus:ring-[#34088f]/20 transition-all font-inter"
                >
                  <option value="new">New</option>
                  <option value="replacement">Replacement</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                  <svg className="h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label htmlFor="paypal-status" className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Status
              </label>
              <div className="relative">
                <select
                  id="paypal-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as PaypalOrderStatus)}
                  disabled={isPending}
                  className="appearance-none w-full h-10 pl-4 pr-10 bg-white border border-[#e0d9f7] rounded-full text-sm text-gray-700 cursor-pointer outline-none focus:border-[#34088f] focus:ring-2 focus:ring-[#34088f]/20 transition-all font-inter"
                >
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="suspended">Suspended</option>
                  <option value="failed">Failed</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                  <svg className="h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label htmlFor="paypal-notes" className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Notes
            </label>
            <textarea
              id="paypal-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isPending}
              placeholder="Add optional notes about the order..."
              rows={3}
              className="block w-full px-4 py-3 border border-[#e0d9f7] rounded-2xl text-sm text-[#111111] placeholder-[#9ca3af] outline-none focus:border-[#34088f] focus:ring-2 focus:ring-[#34088f]/20 transition-all font-inter resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-5 py-2.5 text-xs font-bold text-gray-700 bg-white border border-[#e0d9f7] rounded-full hover:bg-gray-50 transition-colors disabled:opacity-50 font-inter"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2.5 text-xs font-bold text-white bg-[#34088f] hover:bg-[#34088f]/90 rounded-full transition-colors flex items-center gap-1.5 disabled:opacity-50 font-inter"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {mode === 'create' ? 'Create Order' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
