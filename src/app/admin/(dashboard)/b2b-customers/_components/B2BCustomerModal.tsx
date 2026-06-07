/**
 * @file B2BCustomerModal.tsx
 * @description Create / edit a B2B customer and the LLC orders assigned to them.
 */

'use client';

import React, { useState, useTransition } from 'react';
import { X, Loader2 } from 'lucide-react';
import { AssignableOrder, B2BCustomer } from '@/types/admin';
import { createB2BCustomer, updateB2BCustomer } from '@/lib/admin/actions/b2bCustomerActions';
import { OrderMultiSelect } from './OrderMultiSelect';

interface B2BCustomerModalProps {
  mode: 'create' | 'edit';
  orders: AssignableOrder[];
  customer?: B2BCustomer;
  onClose: () => void;
}

export function B2BCustomerModal({ mode, orders, customer, onClose }: B2BCustomerModalProps) {
  const [fullName, setFullName] = useState(customer?.fullName || '');
  const [email, setEmail] = useState(customer?.email || '');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState(customer?.phone || '');
  const [selectedOrders, setSelectedOrders] = useState<string[]>(customer?.assignedOrderIds || []);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (mode === 'create' && password.trim().length < 8) {
      setError('Password is required (min 8 characters) for new customers.');
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append('email', email.trim());
      formData.append('password', password.trim());
      formData.append('fullName', fullName.trim());
      formData.append('phone', phone.trim());
      selectedOrders.forEach((id) => formData.append('orderIds', id));

      const result =
        mode === 'create'
          ? await createB2BCustomer(formData)
          : await updateB2BCustomer(customer!.id, formData);

      if (result.error) {
        setError(result.error);
      } else {
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-[#e0d9f7] shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 font-inter max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e0d9f7] bg-[#f4f0fe] rounded-t-2xl flex-shrink-0">
          <h3 className="text-base font-bold text-gray-900 font-manrope">
            {mode === 'create' ? 'Create B2B Customer' : 'Edit B2B Customer'}
          </h3>
          <button onClick={onClose} aria-label="Close modal" className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 font-inter overflow-y-auto">
          {error && (
            <div className="p-3 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="b2b-fullname" className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Full Name</label>
            <input
              id="b2b-fullname"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={isPending}
              placeholder="e.g. Acme Partners"
              className="block w-full h-10 px-4 border border-[#e0d9f7] rounded-full text-sm text-[#111111] placeholder-[#9ca3af] outline-none focus:border-[#34088f] focus:ring-2 focus:ring-[#34088f]/20 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="b2b-email" className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Email Address</label>
            <input
              id="b2b-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isPending}
              placeholder="e.g. partner@example.com"
              className="block w-full h-10 px-4 border border-[#e0d9f7] rounded-full text-sm text-[#111111] placeholder-[#9ca3af] outline-none focus:border-[#34088f] focus:ring-2 focus:ring-[#34088f]/20 transition-all select-text"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="b2b-password" className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Password</label>
            <input
              id="b2b-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={mode === 'create'}
              disabled={isPending}
              placeholder={mode === 'create' ? 'Min 8 characters' : '••••••••'}
              className="block w-full h-10 px-4 border border-[#e0d9f7] rounded-full text-sm text-[#111111] placeholder-[#9ca3af] outline-none focus:border-[#34088f] focus:ring-2 focus:ring-[#34088f]/20 transition-all"
            />
            {mode === 'edit' && (
              <p className="text-[10px] text-gray-400 font-semibold px-2">Leave blank to keep current password</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="b2b-phone" className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Phone Number</label>
            <input
              id="b2b-phone"
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isPending}
              placeholder="e.g. +1 234 567 8900"
              className="block w-full h-10 px-4 border border-[#e0d9f7] rounded-full text-sm text-[#111111] placeholder-[#9ca3af] outline-none focus:border-[#34088f] focus:ring-2 focus:ring-[#34088f]/20 transition-all select-text"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Assigned LLC Orders (read-only access)</label>
            <OrderMultiSelect
              orders={orders}
              selected={selectedOrders}
              onChange={setSelectedOrders}
              disabled={isPending}
            />
          </div>

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
              {mode === 'create' ? 'Create Customer' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
