import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { CouponDiscountType } from '@/types/onboarding'

export interface ResolvedCoupon {
  id: string
  name: string
  code: string
  discountType: CouponDiscountType
  discountValue: number
  discountAmount: number
  totalUses: number
  usedCount: number
  perUserUses: number
  status: 'active' | 'inactive'
}

export interface CouponValidationInput {
  code: string
  userId: string
  subtotal: number
}

function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase()
}

function calculateDiscount(coupon: Pick<ResolvedCoupon, 'discountType' | 'discountValue'>, subtotal: number): number {
  const safeSubtotal = Number.isFinite(subtotal) && subtotal > 0 ? subtotal : 0

  if (coupon.discountType === 'percentage') {
    const pct = Math.min(Math.max(Number(coupon.discountValue) || 0, 0), 100)
    return Math.min(safeSubtotal, Number((safeSubtotal * (pct / 100)).toFixed(2)))
  }

  const amount = Math.max(0, Number(coupon.discountValue) || 0)
  return Math.min(safeSubtotal, Number(amount.toFixed(2)))
}

async function fetchCouponUsageCount(
  supabase: SupabaseClient<Database>,
  couponId: string,
  userId: string
): Promise<number> {
  const { count } = await supabase
    .from('coupon_usages')
    .select('id', { count: 'exact', head: true })
    .eq('coupon_id', couponId)
    .eq('user_id', userId)

  return count ?? 0
}

export async function validateCoupon(
  supabase: SupabaseClient<Database>,
  { code, userId, subtotal }: CouponValidationInput
): Promise<{ coupon: ResolvedCoupon } | { error: string }> {
  const normalized = normalizeCouponCode(code)
  if (!normalized) {
    return { error: 'Coupon code is required.' }
  }

  const { data: coupon, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', normalized)
    .maybeSingle()

  if (error || !coupon) {
    return { error: 'Coupon not found.' }
  }

  const active = coupon.status === 'active'
  if (!active) {
    return {
      error: coupon.status === 'deleted'
        ? 'This coupon is no longer available.'
        : 'This coupon is inactive.',
    }
  }

  const totalUses = Number(coupon.total_uses ?? -1)
  const usedCount = Number(coupon.used_count || 0)
  const perUserUses = Number(coupon.per_user_uses ?? -1)

  if (totalUses < -1 || perUserUses < -1) {
    return { error: 'This coupon is misconfigured. Please contact support.' }
  }

  // -1 means unlimited: skip the cap check entirely
  if (totalUses !== -1 && totalUses > 0 && usedCount >= totalUses) {
    return { error: 'This coupon has reached its usage limit.' }
  }

  const userUsageCount = await fetchCouponUsageCount(supabase, coupon.id, userId)
  // -1 means unlimited per user: skip the per-user cap check
  if (perUserUses !== -1 && perUserUses > 0 && userUsageCount >= perUserUses) {
    return { error: 'You have already used this coupon the maximum number of times.' }
  }

  const resolved: ResolvedCoupon = {
    id: coupon.id,
    name: coupon.name,
    code: normalizeCouponCode(coupon.code),
    discountType: coupon.discount_type as CouponDiscountType,
    discountValue: Number(coupon.discount_value || 0),
    discountAmount: calculateDiscount({
      discountType: coupon.discount_type as CouponDiscountType,
      discountValue: Number(coupon.discount_value || 0),
    }, subtotal),
    totalUses,
    usedCount,
    perUserUses,
    status: active ? 'active' : 'inactive',
  }

  return { coupon: resolved }
}

export async function redeemCoupon(
  supabase: SupabaseClient<Database>,
  input: CouponValidationInput & { orderId?: string | null }
): Promise<
  | { coupon: ResolvedCoupon; usageId: string; discountAmount: number }
  | { error: string }
> {
  const validation = await validateCoupon(supabase, input)
  if ('error' in validation) {
    return validation
  }

  const { coupon } = validation

  const { error: usageInsertError, data: usageRow } = await supabase
    .from('coupon_usages')
    .insert({
      coupon_id: coupon.id,
      user_id: input.userId,
      order_id: input.orderId ?? null,
      discount_amount: coupon.discountAmount,
    })
    .select('id')
    .single()

  if (usageInsertError || !usageRow) {
    return { error: usageInsertError?.message || 'Unable to record coupon usage.' }
  }

  const { error: updateError } = await supabase
    .from('coupons')
    .update({
      used_count: coupon.usedCount + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', coupon.id)

  if (updateError) {
    return { error: updateError.message }
  }

  return {
    coupon,
    usageId: usageRow.id,
    discountAmount: coupon.discountAmount,
  }
}

export async function recordCouponUsage(
  supabase: SupabaseClient<Database>,
  input: {
    coupon: ResolvedCoupon
    userId: string
    orderId: string
  }
): Promise<{ usageId: string } | { error: string }> {
  const { coupon, userId, orderId } = input

  const { error: usageInsertError, data: usageRow } = await supabase
    .from('coupon_usages')
    .insert({
      coupon_id: coupon.id,
      user_id: userId,
      order_id: orderId,
      discount_amount: coupon.discountAmount,
    })
    .select('id')
    .single()

  if (usageInsertError || !usageRow) {
    return { error: usageInsertError?.message || 'Unable to record coupon usage.' }
  }

  const { error: updateError } = await supabase
    .from('coupons')
    .update({
      used_count: coupon.usedCount + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', coupon.id)

  if (updateError) {
    return { error: updateError.message }
  }

  return { usageId: usageRow.id }
}

export function calculateCouponDiscountAmount(
  discountType: CouponDiscountType,
  discountValue: number,
  subtotal: number
): number {
  return calculateDiscount({ discountType, discountValue }, subtotal)
}
