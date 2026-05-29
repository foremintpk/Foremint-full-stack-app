'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface SettingsLogoutConfirmProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isConfirming: boolean;
}

export function SettingsLogoutConfirm({
  isOpen,
  onClose,
  onConfirm,
  isConfirming,
}: SettingsLogoutConfirmProps): React.JSX.Element | null {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all z-10 border border-red-100">
        {/* Header */}
        <div className="bg-red-50 px-6 py-4 rounded-t-2xl border-b border-red-100">
          <h3 className="text-base font-bold font-manrope text-red-700">
            Sign Out All Devices
          </h3>
        </div>

        {/* Body */}
        <div className="bg-white px-6 py-5">
          <p className="text-sm font-semibold text-gray-500 font-inter leading-relaxed">
            This will immediately invalidate all active sessions on all devices, including this one. You will need to log in again.
          </p>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex flex-row justify-end gap-3 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            disabled={isConfirming}
            className="h-10 px-5 text-sm font-semibold rounded-full border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 active:scale-[0.98] transition font-inter disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            className="inline-flex items-center justify-center gap-2 h-10 px-6 text-sm font-semibold rounded-full bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white transition font-inter shadow-[0_1px_4px_rgba(220,38,38,0.15)] disabled:opacity-50"
          >
            {isConfirming ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Signing Out...
              </>
            ) : (
              'Sign Out All'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsLogoutConfirm;
