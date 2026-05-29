import React from 'react'
import { redirect } from 'next/navigation'
import { TicketPercent, Users, Clock3, ListChecks } from 'lucide-react'
import { getAdminUser } from '@/lib/admin/getAdminUser'
import { getCouponsDashboardData } from '@/lib/admin/getCoupons'
import { CouponCreateButton } from './_components/CouponCreateButton'
import { CouponCard } from './_components/CouponCard'
import { CouponUsageTable } from './_components/CouponUsageTable'
import { CouponEmptyState } from './_components/CouponEmptyState'

export const revalidate = 60

export default async function CouponsPage() {
  const adminUser = await getAdminUser()
  if (!adminUser) {
    redirect('/sign-in?redirect=/admin/coupons')
  }

  const { coupons, usages } = await getCouponsDashboardData()

  const stats = {
    total: coupons.length,
    active: coupons.filter((coupon) => coupon.status === 'active').length,
    totalUses: usages.length,
    recentUses: usages.slice(0, 5).length,
  }

  return (
    <div className="space-y-6 font-inter select-text pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900 font-manrope">Coupons</h1>
          <p className="text-xs font-semibold text-gray-500 font-inter">
            Create coupon codes, cap usage, and review redemptions.
          </p>
        </div>
        <CouponCreateButton />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={<TicketPercent className="h-5 w-5" />} label="Total Coupons" value={stats.total} />
        <StatCard icon={<Users className="h-5 w-5" />} label="Active Coupons" value={stats.active} />
        <StatCard icon={<ListChecks className="h-5 w-5" />} label="Redemptions" value={stats.totalUses} />
        <StatCard icon={<Clock3 className="h-5 w-5" />} label="Recent Uses" value={stats.recentUses} />
      </div>

      {coupons.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {coupons.map((coupon) => (
              <CouponCard key={coupon.id} coupon={coupon} />
            ))}
          </div>
          <CouponUsageTable usages={usages} />
        </div>
      ) : (
        <CouponEmptyState />
      )}
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#34088f]/10 text-[#34088f]">
          {icon}
        </div>
        <div>
          <p className="text-2xl font-black text-gray-900 font-manrope">{value}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  )
}
