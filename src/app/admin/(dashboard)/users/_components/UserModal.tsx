/**
 * @file src/app/admin/(dashboard)/users/_components/UserModal.tsx
 * @description Client Component modal for creating or editing user profile.
 */

'use client';

import React, { useState, useTransition } from 'react';
import { AdminUser, UserRole } from '@/types/admin';
import { createUser, updateUser } from '@/lib/admin/actions/userActions';
import { X, Loader2 } from 'lucide-react';

interface UserModalProps {
  mode: 'create' | 'edit';
  user?: AdminUser;
  onClose: () => void;
}

export function UserModal({ mode, user, onClose }: UserModalProps): React.JSX.Element {
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [role, setRole] = useState<UserRole>(user?.role || 'customer');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Frontend validations
    if (!email.trim()) {
      setError('Email is required.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (mode === 'create' && !password.trim()) {
      setError('Password is required for new users.');
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append('email', email.trim());
      formData.append('password', password.trim());
      formData.append('fullName', fullName.trim());
      formData.append('phone', phone.trim());
      formData.append('role', role);

      let result;
      if (mode === 'create') {
        result = await createUser(formData);
      } else {
        result = await updateUser(user!.id, formData);
      }

      if (result.error) {
        setError(result.error);
      } else {
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl border border-[#e0d9f7] shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 font-inter">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e0d9f7] bg-[#f4f0fe] rounded-t-2xl">
          <h3 className="text-base font-bold text-gray-900 font-manrope">
            {mode === 'create' ? 'Create User' : 'Edit User Profile'}
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

          {/* Full Name */}
          <div className="space-y-1.5">
            <label htmlFor="user-fullname" className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Full Name
            </label>
            <input
              id="user-fullname"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={isPending}
              placeholder="e.g. John Doe"
              className="block w-full h-10 px-4 border border-[#e0d9f7] rounded-full text-sm text-[#111111] placeholder-[#9ca3af] outline-none focus:border-[#34088f] focus:ring-2 focus:ring-[#34088f]/20 transition-all font-inter"
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="user-email" className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Email Address
            </label>
            <input
              id="user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isPending}
              placeholder="e.g. john@example.com"
              className="block w-full h-10 px-4 border border-[#e0d9f7] rounded-full text-sm text-[#111111] placeholder-[#9ca3af] outline-none focus:border-[#34088f] focus:ring-2 focus:ring-[#34088f]/20 transition-all font-inter select-text"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label htmlFor="user-password" className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Password
            </label>
            <input
              id="user-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={mode === 'create'}
              disabled={isPending}
              placeholder={mode === 'create' ? 'Enter password' : '••••••••'}
              className="block w-full h-10 px-4 border border-[#e0d9f7] rounded-full text-sm text-[#111111] placeholder-[#9ca3af] outline-none focus:border-[#34088f] focus:ring-2 focus:ring-[#34088f]/20 transition-all font-inter"
            />
            {mode === 'edit' && (
              <p className="text-[10px] text-gray-400 font-semibold px-2">
                Leave blank to keep current password
              </p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label htmlFor="user-phone" className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Phone Number
            </label>
            <input
              id="user-phone"
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isPending}
              placeholder="e.g. +1 234 567 8900"
              className="block w-full h-10 px-4 border border-[#e0d9f7] rounded-full text-sm text-[#111111] placeholder-[#9ca3af] outline-none focus:border-[#34088f] focus:ring-2 focus:ring-[#34088f]/20 transition-all font-inter select-text"
            />
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <label htmlFor="user-role" className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Role
            </label>
            <div className="relative">
              <select
                id="user-role"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                disabled={isPending}
                className="appearance-none w-full h-10 pl-4 pr-10 bg-white border border-[#e0d9f7] rounded-full text-sm text-[#374151] cursor-pointer outline-none focus:border-[#34088f] focus:ring-2 focus:ring-[#34088f]/20 transition-all font-inter"
              >
                <option value="customer">Customer</option>
                <option value="manager">Manager</option>
                <option value="administrator">Administrator</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                <svg className="h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
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
              {mode === 'create' ? 'Create User' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
export default UserModal;
