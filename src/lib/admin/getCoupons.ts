import { unstable_cache } from 'next/cache'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { Coupon, CouponUsage } from '@/types/admin'

export interface CouponsDashboardData {
  coupons: Coupon[]
  usages: CouponUsage[]
}

async function fetchCouponsQuery(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<CouponsDashboardData> {
  const [couponsRes, usagesRes] = await Promise.all([
    supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('coupon_usages')
      .select(`
        id,
        coupon_id,
        order_id,
        user_id,
        discount_amount,
        used_at,
        coupons!coupon_id (
          name,
          code
        ),
        profiles!user_id (
          full_name,
          email
        ),
        orders!order_id (
          order_number
        )
      `)
      .order('used_at', { ascending: false }),
  ])

  const coupons: Coupon[] = (couponsRes.data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    code: row.code,
    discountType: row.discount_type,
    discountValue: Number(row.discount_value || 0),
    totalUses: Number(row.total_uses || 0),
    usedCount: Number(row.used_count || 0),
    perUserUses: Number(row.per_user_uses || 0),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))

  const usages: CouponUsage[] = (usagesRes.data ?? []).map((row: any) => ({
    id: row.id,
    couponId: row.coupon_id,
    couponName: row.coupons?.name || 'Coupon',
    couponCode: row.coupons?.code || '',
    userId: row.user_id,
    userName: row.profiles?.full_name || null,
    userEmail: row.profiles?.email || null,
    orderId: row.order_id || null,
    orderNumber: row.orders?.order_number || null,
    discountAmount: Number(row.discount_amount || 0),
    usedAt: row.used_at,
  }))

  return { coupons, usages }
}

export async function getCouponsDashboardData(): Promise<CouponsDashboardData> {
  const supabase = await createClient()
  return unstable_cache(
    async () => fetchCouponsQuery(supabase),
    ['admin-coupons-dashboard'],
    {
      revalidate: 60,
      tags: ['coupons'],
    }
  )()
}

export const getCachedCouponsDashboardData = cache(async () => {
  return getCouponsDashboardData()
})
