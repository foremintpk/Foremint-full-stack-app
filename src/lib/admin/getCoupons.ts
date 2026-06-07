import { unstable_cache } from 'next/cache'
import { cache } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/types/database'
import type { Coupon, CouponUsage, CouponDiscountType, CouponStatus } from '@/types/admin'

type CouponRow = Database['public']['Tables']['coupons']['Row']

type CouponUsageQueryRow = Database['public']['Tables']['coupon_usages']['Row'] & {
  coupons?: {
    name: string | null
    code: string | null
  } | null
  profiles?: {
    full_name: string | null
    email: string | null
  } | null
  orders?: {
    order_number: string | null
  } | null
}

export interface CouponsDashboardData {
  coupons: Coupon[]
  usages: CouponUsage[]
}

async function fetchCouponsQuery(
  supabase: ReturnType<typeof createAdminClient>
): Promise<CouponsDashboardData> {
  const [couponsRes, usagesRes] = await Promise.all([
    supabase
      .from('coupons')
      .select('*')
      .neq('status', 'deleted')
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

  const coupons: Coupon[] = (couponsRes.data ?? []).map((row: CouponRow) => ({
    id: row.id,
    name: row.name,
    code: row.code,
    discountType: row.discount_type as CouponDiscountType,
    discountValue: Number(row.discount_value || 0),
    totalUses: Number(row.total_uses || 0),
    usedCount: Number(row.used_count || 0),
    perUserUses: Number(row.per_user_uses || 0),
    status: row.status as CouponStatus,
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
  const supabase = createAdminClient()
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
