/**
 * @file src/app/admin/packages/_components/PackageDeleteConfirm.tsx
 * @description Client Component to confirm deletion of a package.
 */

'use client';

import React, { useState, useTransition } from 'react';
import { deletePackage } from '@/lib/admin/actions/packageActions';
import { Package } from '@/types/admin';

interface PackageDeleteConfirmProps {
  pkg: Package;
  onClose: () => void;
}

export function PackageDeleteConfirm({
  pkg,
  onClose,
}: PackageDeleteConfirmProps): React.JSX.Element {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      const res = await deletePackage(pkg.id);
      if (res.success) {
        onClose();
      } else {
        setError(res.error || 'Failed to delete package.');
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-red-50 px-6 py-4 text-red-700">
          <h3 className="text-lg font-bold font-manrope">Delete Package</h3>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-sm text-gray-600">
            Are you sure you want to permanently delete the package{' '}
            <strong className="text-gray-900 font-semibold">{pkg.name}</strong>?
            This action cannot be undone.
          </p>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-full border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#34088f]/20 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="flex items-center justify-center gap-2 rounded-full bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 disabled:opacity-50"
          >
            {isPending ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
