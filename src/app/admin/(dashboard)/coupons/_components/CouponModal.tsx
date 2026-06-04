'use client'

import React, { useRef, useState, useTransition } from 'react'
import { createCoupon, updateCoupon } from '@/lib/admin/actions/couponActions'
import type { Coupon } from '@/types/admin'

interface CouponModalProps {
  mode: 'create' | 'edit'
  coupon?: Coupon
  onClose: () => void
}

/** Validate a usage-limit field: must be -1 (unlimited) or a positive integer >= 1 */
function isValidUsageLimit(value: string): boolean {
  const n = Number(value)
  if (!Number.isFinite(n)) return false
  if (n === -1) return true
  return Number.isInteger(n) && n >= 1
}

export function CouponModal({ mode, coupon, onClose }: CouponModalProps): React.JSX.Element {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [totalUsesVal, setTotalUsesVal] = useState<string>(
    coupon ? String(coupon.totalUses) : '-1'
  )
  const [perUserUsesVal, setPerUserUsesVal] = useState<string>(
    coupon ? String(coupon.perUserUses) : '-1'
  )
  const formRef = useRef<HTMLFormElement>(null)

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!formRef.current) return

    // Client-side validation for usage limits
    if (!isValidUsageLimit(totalUsesVal)) {
      setError('Total Uses must be -1 (unlimited) or a positive integer (e.g. 100)')
      return
    }
    if (!isValidUsageLimit(perUserUsesVal)) {
      setError('Per User must be -1 (unlimited) or a positive integer (e.g. 1)')
      return
    }

    const formData = new FormData(formRef.current)
    setError(null)

    startTransition(async () => {
      const result = mode === 'edit' && coupon
        ? await updateCoupon(coupon.id, formData)
        : await createCoupon(formData)

      if (result.success) {
        onClose()
      } else {
        setError(result.error || 'Something went wrong.')
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl transition-all my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#f4f0fe] px-6 py-4 rounded-t-2xl border-b border-[#e0d9f7] flex items-center justify-between">
          <h3 className="text-lg font-bold font-manrope text-[#34088f]">
            {mode === 'edit' ? 'Edit Coupon' : 'Create Coupon'}
          </h3>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-gray-500 hover:bg-[#34088f]/10 hover:text-[#34088f] transition-colors"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form ref={formRef} onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Coupon Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 pl-1">
                Coupon Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                required
                defaultValue={coupon?.name}
                disabled={isPending}
                placeholder="e.g. Launch Special"
                className="w-full rounded-full border border-[#e0d9f7] px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#34088f]/20 focus:border-[#34088f] disabled:bg-gray-50"
              />
            </div>

            {/* Coupon Code + Discount Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 pl-1">
                  Coupon Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="code"
                  required
                  defaultValue={coupon?.code}
                  disabled={isPending}
                  placeholder="SAVE20"
                  className="w-full rounded-full border border-[#e0d9f7] px-4 py-2 text-sm text-gray-900 placeholder-gray-400 uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-[#34088f]/20 focus:border-[#34088f] disabled:bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 pl-1">
                  Discount Type
                </label>
                <select
                  name="discountType"
                  defaultValue={coupon?.discountType ?? 'percentage'}
                  disabled={isPending}
                  className="w-full rounded-full border border-[#e0d9f7] px-4 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#34088f]/20 focus:border-[#34088f] disabled:bg-gray-50"
                >
                  <option value="percentage">Percentage Discount</option>
                  <option value="amount">Amount Discount</option>
                </select>
              </div>
            </div>

            {/* Discount Value + Total Uses + Per User */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Discount Value */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 pl-1">
                  Discount Value <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="discountValue"
                  required
                  step="0.01"
                  min="0.01"
                  defaultValue={coupon?.discountValue ?? ''}
                  disabled={isPending}
                  placeholder="20"
                  className="w-full rounded-full border border-[#e0d9f7] px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#34088f]/20 focus:border-[#34088f] disabled:bg-gray-50"
                />
              </div>

              {/* Total Uses */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 pl-1">
                  Total Uses <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="totalUses"
                  required
                  step="1"
                  value={totalUsesVal}
                  onChange={(e) => setTotalUsesVal(e.target.value)}
                  disabled={isPending}
                  placeholder="-1"
                  className={`w-full rounded-full border px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#34088f]/20 focus:border-[#34088f] disabled:bg-gray-50 ${
                    totalUsesVal && !isValidUsageLimit(totalUsesVal)
                      ? 'border-red-400 bg-red-50'
                      : 'border-[#e0d9f7]'
                  }`}
                />
                <p className="mt-1 pl-1 text-[10px] text-gray-400 font-medium">
                  Enter -1 for unlimited usage
                </p>
              </div>

              {/* Per User */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 pl-1">
                  Per User <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="perUserUses"
                  required
                  step="1"
                  value={perUserUsesVal}
                  onChange={(e) => setPerUserUsesVal(e.target.value)}
                  disabled={isPending}
                  placeholder="-1"
                  className={`w-full rounded-full border px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#34088f]/20 focus:border-[#34088f] disabled:bg-gray-50 ${
                    perUserUsesVal && !isValidUsageLimit(perUserUsesVal)
                      ? 'border-red-400 bg-red-50'
                      : 'border-[#e0d9f7]'
                  }`}
                />
                <p className="mt-1 pl-1 text-[10px] text-gray-400 font-medium">
                  Enter -1 for unlimited usage per customer
                </p>
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 pl-1">
                Status
              </label>
              <select
                name="status"
                defaultValue={coupon?.status ?? 'active'}
                disabled={isPending}
                className="w-full rounded-full border border-[#e0d9f7] px-4 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#34088f]/20 focus:border-[#34088f] disabled:bg-gray-50"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

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
              {isPending ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Create Coupon'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
