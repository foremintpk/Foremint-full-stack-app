/**
 * @file src/app/admin/packages/_components/PackageModal.tsx
 * @description Client Component modal for creating and editing packages.
 */

'use client';

import React, { useState, useRef, useTransition } from 'react';
import { createPackage, updatePackage } from '@/lib/admin/actions/packageActions';
import { Package, PackageStatus } from '@/types/admin';

interface PackageModalProps {
  mode: 'create' | 'edit';
  pkg?: Package;
  onClose: () => void;
}

export function PackageModal({ mode, pkg, onClose }: PackageModalProps): React.JSX.Element {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formRef.current) return;

    setError(null);
    const formData = new FormData(formRef.current);

    startTransition(async () => {
      let res;
      if (mode === 'edit' && pkg) {
        res = await updatePackage(pkg.id, formData);
      } else {
        res = await createPackage(formData);
      }

      if (res.success) {
        onClose();
      } else {
        setError(res.error || 'Something went wrong.');
      }
    });
  };

  const isEdit = mode === 'edit';
  const defaultFeatures = pkg?.features.join('\n') || '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl transition-all my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#f4f0fe] px-6 py-4 rounded-t-2xl border-b border-[#e0d9f7] flex items-center justify-between">
          <h3 className="text-lg font-bold font-manrope text-[#34088f]">
            {isEdit ? 'Edit Package' : 'Create Package'}
          </h3>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-gray-500 hover:bg-[#34088f]/10 hover:text-[#34088f] transition-colors"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form ref={formRef} onSubmit={handleSubmit}>
          {/* Content */}
          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 pl-1">
                Package Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                disabled={isPending}
                defaultValue={pkg?.name}
                placeholder="e.g. Starter Package"
                className="w-full rounded-full border border-[#e0d9f7] px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#34088f]/20 focus:border-[#34088f] disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>

            {/* Price & Sort Order Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Price */}
              <div>
                <label htmlFor="price" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 pl-1">
                  Price (PKR) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  required
                  min="0"
                  disabled={isPending}
                  defaultValue={pkg?.price}
                  placeholder="e.g. 15000"
                  className="w-full rounded-full border border-[#e0d9f7] px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#34088f]/20 focus:border-[#34088f] disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>

              {/* Display Order */}
              <div>
                <label htmlFor="sortOrder" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 pl-1">
                  Display Order
                </label>
                <input
                  type="number"
                  id="sortOrder"
                  name="sortOrder"
                  disabled={isPending}
                  defaultValue={pkg?.sortOrder ?? 0}
                  placeholder="e.g. 0"
                  className="w-full rounded-full border border-[#e0d9f7] px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#34088f]/20 focus:border-[#34088f] disabled:bg-gray-50 disabled:text-gray-500"
                />
                <span className="block text-[10px] text-gray-400 mt-1 pl-1">
                  Lower numbers display first.
                </span>
              </div>
            </div>

            {/* Status */}
            <div>
              <label htmlFor="status" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 pl-1">
                Status
              </label>
              <div className="relative">
                <select
                  id="status"
                  name="status"
                  disabled={isPending}
                  defaultValue={pkg?.status ?? 'draft'}
                  className="w-full rounded-full border border-[#e0d9f7] pl-4 pr-10 py-2 text-sm text-gray-900 bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-[#34088f]/20 focus:border-[#34088f] disabled:bg-gray-50 disabled:text-gray-500"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Features */}
            <div>
              <label htmlFor="featuresRaw" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 pl-1">
                Features
              </label>
              <textarea
                id="featuresRaw"
                name="featuresRaw"
                rows={6}
                disabled={isPending}
                defaultValue={defaultFeatures}
                placeholder="e.g.&#10;Registered Agent Service (1 Year)&#10;Articles of Organization filing&#10;Custom Operating Agreement"
                className="w-full rounded-2xl border border-[#e0d9f7] px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#34088f]/20 focus:border-[#34088f] disabled:bg-gray-50 disabled:text-gray-500 resize-none"
              />
              <span className="block text-[10px] text-gray-400 mt-1 pl-1">
                Enter each feature on a new line. Empty lines will be ignored.
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-full border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#34088f]/20 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center justify-center gap-2 rounded-full bg-[#34088f] px-5 py-2 text-sm font-medium text-white hover:bg-[#34088f]/90 focus:outline-none focus:ring-2 focus:ring-[#34088f]/20 disabled:opacity-50"
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
                  {isEdit ? 'Saving...' : 'Creating...'}
                </>
              ) : isEdit ? (
                'Save Changes'
              ) : (
                'Create Package'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
