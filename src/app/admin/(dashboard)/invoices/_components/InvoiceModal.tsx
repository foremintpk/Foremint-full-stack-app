'use client';

import React, { useState, useTransition } from 'react';
import { createInvoice, updateInvoice } from '@/lib/admin/actions/invoiceActions';
import { Invoice } from '@/types/admin';
import { X, Loader2 } from 'lucide-react';

interface InvoiceModalProps {
  mode: 'create' | 'edit';
  invoice?: Invoice;
  onClose: () => void;
}

export function InvoiceModal({ mode, invoice, onClose }: InvoiceModalProps) {
  const [name, setName] = useState(invoice?.name || '');
  const [date, setDate] = useState(invoice?.date || new Date().toISOString().split('T')[0]);
  const [totalAmountPkr, setTotalAmountPkr] = useState(invoice?.totalAmountPkr !== undefined ? String(invoice.totalAmountPkr) : '');
  const [commissionEarned, setCommissionEarned] = useState(invoice?.commissionEarned !== undefined ? String(invoice.commissionEarned) : '');
  const [notes, setNotes] = useState(invoice?.notes || '');

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Client/customer name is required.');
      return;
    }
    if (!date) {
      setError('Date is required.');
      return;
    }
    if (!totalAmountPkr || isNaN(Number(totalAmountPkr)) || Number(totalAmountPkr) < 0) {
      setError('Please enter a valid total amount >= 0.');
      return;
    }
    if (!commissionEarned || isNaN(Number(commissionEarned)) || Number(commissionEarned) < 0) {
      setError('Please enter a valid commission earned >= 0.');
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('date', date);
      formData.append('totalAmountPkr', totalAmountPkr);
      formData.append('commissionEarned', commissionEarned);
      formData.append('notes', notes.trim() || '');

      let res;
      if (mode === 'create') {
        res = await createInvoice(formData);
      } else {
        res = await updateInvoice(invoice!.id, formData);
      }

      if (res && res.error) {
        setError(res.error);
      } else {
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in font-inter">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-[#e0d9f7] shadow-xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e0d9f7] bg-[#f4f0fe] rounded-t-2xl">
          <h3 className="text-base font-bold text-gray-900 font-manrope">
            {mode === 'create' ? 'Create Invoice' : 'Edit Invoice'}
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

          {/* Invoice Number (Display only) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Invoice Number
            </label>
            {mode === 'create' ? (
              <div className="block w-full h-10 px-4 border border-[#e0d9f7] bg-gray-50 text-gray-400 rounded-full text-sm flex items-center select-none font-medium">
                (auto-generated)
              </div>
            ) : (
              <input
                type="text"
                value={invoice?.invoiceNumber || ''}
                disabled
                className="block w-full h-10 px-4 border border-[#e0d9f7] bg-gray-50 text-gray-500 rounded-full text-sm outline-none font-medium opacity-60 cursor-not-allowed select-text font-mono"
              />
            )}
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label htmlFor="invoice-date" className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Date
            </label>
            <input
              id="invoice-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={isPending}
              className="block w-full h-10 px-4 border border-[#e0d9f7] rounded-full text-sm text-[#111111] outline-none focus:border-[#34088f] focus:ring-2 focus:ring-[#34088f]/20 transition-all"
              required
            />
          </div>

          {/* Client Name */}
          <div className="space-y-1.5">
            <label htmlFor="invoice-name" className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Client/Customer Name
            </label>
            <input
              id="invoice-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
              placeholder="e.g. Acme Corp"
              className="block w-full h-10 px-4 border border-[#e0d9f7] rounded-full text-sm text-[#111111] placeholder-[#9ca3af] outline-none focus:border-[#34088f] focus:ring-2 focus:ring-[#34088f]/20 transition-all"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Total Amount (PKR) */}
            <div className="space-y-1.5">
              <label htmlFor="invoice-totalAmountPkr" className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Total Amount
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 text-xs font-bold">
                  PKR
                </span>
                <input
                  id="invoice-totalAmountPkr"
                  type="number"
                  step="0.01"
                  min="0"
                  value={totalAmountPkr}
                  onChange={(e) => setTotalAmountPkr(e.target.value)}
                  disabled={isPending}
                  placeholder="0.00"
                  className="block w-full h-10 pl-12 pr-4 border border-[#e0d9f7] rounded-full text-sm text-[#111111] placeholder-[#9ca3af] outline-none focus:border-[#34088f] focus:ring-2 focus:ring-[#34088f]/20 transition-all font-inter"
                  required
                />
              </div>
            </div>

            {/* Commission Earned (PKR) */}
            <div className="space-y-1.5">
              <label htmlFor="invoice-commissionEarned" className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Commission Earned
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 text-xs font-bold">
                  PKR
                </span>
                <input
                  id="invoice-commissionEarned"
                  type="number"
                  step="0.01"
                  min="0"
                  value={commissionEarned}
                  onChange={(e) => setCommissionEarned(e.target.value)}
                  disabled={isPending}
                  placeholder="0.00"
                  className="block w-full h-10 pl-12 pr-4 border border-[#e0d9f7] rounded-full text-sm text-[#111111] placeholder-[#9ca3af] outline-none focus:border-[#34088f] focus:ring-2 focus:ring-[#34088f]/20 transition-all font-inter"
                  required
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label htmlFor="invoice-notes" className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Notes
            </label>
            <textarea
              id="invoice-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isPending}
              placeholder="Add optional notes about this invoice..."
              rows={3}
              className="block w-full px-4 py-3 border border-[#e0d9f7] rounded-2xl text-sm text-[#111111] placeholder-[#9ca3af] outline-none focus:border-[#34088f] focus:ring-2 focus:ring-[#34088f]/20 transition-all resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-5 py-2.5 text-xs font-bold text-gray-700 bg-white border border-[#e0d9f7] rounded-full hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2.5 text-xs font-bold text-white bg-[#34088f] hover:bg-[#34088f]/90 rounded-full transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {mode === 'create' ? 'Create Invoice' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
export default InvoiceModal;
