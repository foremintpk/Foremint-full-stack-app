/**
 * @file src/app/admin/(dashboard)/users/_components/UserDeactivateConfirm.tsx
 * @description Client Component modal for confirming deactivation or reactivation.
 */

'use client';

import React, { useTransition, useState } from 'react';
import { AdminUser } from '@/types/admin';
import { deactivateUser } from '@/lib/admin/actions/userActions';
import { Loader2, X } from 'lucide-react';

interface UserDeactivateConfirmProps {
  user: AdminUser;
  onClose: () => void;
}

export function UserDeactivateConfirm({
  user,
  onClose,
}: UserDeactivateConfirmProps): React.JSX.Element {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const name = user.fullName || user.email;

  const handleConfirm = () => {
    setError(null);
    startTransition(async () => {
      const result = await deactivateUser(user.id, user.isActive);
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
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b border-[#e0d9f7] ${
            user.isActive ? 'bg-amber-50' : 'bg-emerald-50'
          }`}
        >
          <h3 className="text-base font-bold text-gray-900 font-manrope">
            {user.isActive ? 'Deactivate User Account' : 'Reactivate User Account'}
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
            {user.isActive
              ? `This will block ${name} from logging in. You can reactivate them at any time.`
              : `This will restore ${name}'s access. They will be able to log in again.`}
          </p>

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
              onClick={handleConfirm}
              disabled={isPending}
              className={`px-5 py-2.5 text-xs font-bold text-white rounded-full transition-colors flex items-center gap-1.5 disabled:opacity-50 ${
                user.isActive
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {user.isActive ? 'Deactivate' : 'Reactivate'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
export default UserDeactivateConfirm;
