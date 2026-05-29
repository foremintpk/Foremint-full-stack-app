'use client'

import { useTransition } from 'react'
import { BadgePercent, ToggleLeft, ToggleRight } from 'lucide-react'
import type { Coupon } from '@/types/admin'
import { toggleCouponStatus } from '@/lib/admin/actions/couponActions'
import { useRouter } from 'next/navigation'

export function CouponCard({ coupon }: { coupon: Coupon }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const usagePercent = coupon.totalUses > 0
    ? Math.min(100, Math.round((coupon.usedCount / coupon.totalUses) * 100))
    : 0

  const handleToggle = () => {
    startTransition(async () => {
      const result = await toggleCouponStatus(coupon.id, coupon.status)
      if (result.success) {
        router.refresh()
      }
    })
  }

  return (
    <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#34088f]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#34088f]">
            <BadgePercent className="h-3.5 w-3.5" />
            Coupon
          </div>
          <h3 className="text-lg font-bold text-gray-900 font-manrope">{coupon.name}</h3>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">{coupon.code}</p>
        </div>

        <button
          onClick={handleToggle}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:border-[#34088f]/30 hover:text-[#34088f] disabled:opacity-50"
        >
          {coupon.status === 'active' ? <ToggleRight className="h-4 w-4 text-emerald-600" /> : <ToggleLeft className="h-4 w-4 text-gray-400" />}
          {coupon.status === 'active' ? 'Active' : 'Inactive'}
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <InfoBox label="Discount" value={coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `$${coupon.discountValue.toLocaleString()}`} />
        <InfoBox label="Limit" value={`${coupon.usedCount}/${coupon.totalUses}`} />
        <InfoBox label="Per User" value={`${coupon.perUserUses} use${coupon.perUserUses > 1 ? 's' : ''}`} />
        <InfoBox label="Status" value={coupon.status} />
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          <span>Usage Progress</span>
          <span>{usagePercent}%</span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full rounded-full bg-[#34088f]" style={{ width: `${usagePercent}%` }} />
        </div>
      </div>
    </article>
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
