'use client'

import { useTransition, useState } from 'react'
import { BadgePercent, ToggleLeft, ToggleRight, Pencil, Infinity, Trash2 } from 'lucide-react'
import type { Coupon } from '@/types/admin'
import { deleteCoupon, toggleCouponStatus } from '@/lib/admin/actions/couponActions'
import { useRouter } from 'next/navigation'
import { CouponModal } from './CouponModal'
import { toast } from 'sonner'

export function CouponCard({ coupon }: { coupon: Coupon }) {
  const [isPending, startTransition] = useTransition()
  const [showEditModal, setShowEditModal] = useState(false)
  const router = useRouter()

  // For unlimited coupons (-1), don't show a usage progress bar
  const isUnlimitedTotal = coupon.totalUses === -1
  const usagePercent = !isUnlimitedTotal && coupon.totalUses > 0
    ? Math.min(100, Math.round((coupon.usedCount / coupon.totalUses) * 100))
    : 0

  const handleToggle = () => {
    startTransition(async () => {
      const result = await toggleCouponStatus(coupon.id, coupon.status)
      if (result.success) {
        toast.success('Coupon status updated.')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to update coupon status.')
      }
    })
  }

  const handleDelete = () => {
    const confirmed = window.confirm('Are you sure?\nThis action cannot be undone.')
    if (!confirmed) return

    startTransition(async () => {
      const result = await deleteCoupon(coupon.id)
      if (result.success) {
        toast.success('Coupon deleted.')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to delete coupon.')
      }
    })
  }

  const limitDisplay = isUnlimitedTotal
    ? `${coupon.usedCount} / ∞`
    : `${coupon.usedCount} / ${coupon.totalUses}`

  const perUserDisplay = coupon.perUserUses === -1
    ? 'Unlimited'
    : `${coupon.perUserUses} use${coupon.perUserUses > 1 ? 's' : ''}`

  return (
    <>
      <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#34088f]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#34088f]">
              <BadgePercent className="h-3.5 w-3.5" />
              Coupon
            </div>
            <h3 className="text-lg font-bold text-gray-900 font-manrope truncate">{coupon.name}</h3>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">{coupon.code}</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Edit button */}
            <button
              onClick={() => setShowEditModal(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:border-[#34088f]/30 hover:text-[#34088f] transition-colors"
              title="Edit coupon"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>

            {/* Toggle status */}
            <button
              onClick={handleToggle}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:border-[#34088f]/30 hover:text-[#34088f] disabled:opacity-50 transition-colors"
            >
              {coupon.status === 'active'
                ? <ToggleRight className="h-4 w-4 text-emerald-600" />
                : <ToggleLeft className="h-4 w-4 text-gray-400" />}
              {coupon.status === 'active' ? 'Active' : 'Inactive'}
            </button>

            <button
              onClick={handleDelete}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-full border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:border-red-300 hover:bg-red-50 disabled:opacity-50 transition-colors"
              title="Delete coupon"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <InfoBox
            label="Discount"
            value={coupon.discountType === 'percentage'
              ? `${coupon.discountValue}%`
              : `$${coupon.discountValue.toLocaleString()}`}
          />
          <InfoBox label="Usage" value={limitDisplay} />
          <InfoBox label="Per User" value={perUserDisplay} />
          <InfoBox label="Status" value={coupon.status} />
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            <span>Usage Progress</span>
            {isUnlimitedTotal
              ? <span className="inline-flex items-center gap-1 text-[#34088f]"><Infinity className="h-3 w-3" /> Unlimited</span>
              : <span>{usagePercent}%</span>}
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            {isUnlimitedTotal
              ? <div className="h-full rounded-full bg-gradient-to-r from-[#34088f]/30 via-[#34088f]/60 to-[#34088f]/30 animate-pulse w-full" />
              : <div className="h-full rounded-full bg-[#34088f]" style={{ width: `${usagePercent}%` }} />}
          </div>
        </div>
      </article>

      {showEditModal && (
        <CouponModal
          mode="edit"
          coupon={coupon}
          onClose={() => {
            setShowEditModal(false)
            router.refresh()
          }}
        />
      )}
    </>
  )
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="mt-1 text-sm font-bold text-gray-900">{value}</p>
    </div>
  )
}
