/**
 * @file src/app/admin/(dashboard)/users/_components/UserDeleteConfirm.tsx
 * @description Client Component for confirming hard deletion of a user profile.
 */

'use client';

import React, { useTransition, useState } from 'react';
import { AdminUser } from '@/types/admin';
import { deleteUser } from '@/lib/admin/actions/userActions';
import { Loader2, X } from 'lucide-react';

interface UserDeleteConfirmProps {
  user: AdminUser;
  onClose: () => void;
}

export function UserDeleteConfirm({
  user,
  onClose,
}: UserDeleteConfirmProps): React.JSX.Element {
  const [confirmEmail, setConfirmEmail] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const name = user.fullName || user.email;

  const handleDelete = () => {
    if (confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await deleteUser(user.id);
      if (result.error) {
        setError(result.error);
      } else {
        onClose();
      }
    });
  };

  const isConfirmed = confirmEmail.trim().toLowerCase() === user.email.toLowerCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl border border-[#e0d9f7] shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 font-inter">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e0d9f7] bg-red-50">
          <h3 className="text-base font-bold text-gray-900 font-manrope">
            Delete User Account
          </h3>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl">
              {error}
            </div>
          )}

          <p className="text-sm text-gray-600 leading-relaxed">
            This permanently deletes <span className="font-semibold text-gray-900">{name}</span>&apos;s account. Their orders and records are preserved.
          </p>

          <div className="space-y-2">
            <label htmlFor="confirm-email-input" className="text-xs font-semibold text-gray-500">
              Type the user&apos;s email (<span className="font-bold select-all">{user.email}</span>) to confirm:
            </label>
            <input
              id="confirm-email-input"
              type="text"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              disabled={isPending}
              placeholder="Type email to confirm"
              className="block w-full h-10 px-4 border border-[#e5e7eb] rounded-full text-sm text-[#111111] placeholder-[#9ca3af] outline-none focus:border-red-500 transition-all font-inter"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={isPending}
              className="px-5 py-2.5 text-xs font-bold text-gray-700 bg-white border border-[#e0d9f7] rounded-full hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={!isConfirmed || isPending}
              className="px-5 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-full transition-colors flex items-center gap-1.5"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
export default UserDeleteConfirm;
