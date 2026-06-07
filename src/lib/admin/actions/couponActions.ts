'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { CouponDiscountType, CouponStatus } from '@/types/admin'

const revalidatePathTyped = revalidatePath as unknown as (path: string, type?: 'layout' | 'page') => void

function parseCouponCode(raw: string): string {
  return raw.trim().toUpperCase()
}

async function verifyAdminRole() {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const user = claimsData?.claims ? { id: claimsData.claims.sub } : null

  if (!user) {
    throw new Error('Unauthorized')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  if (!profile || profile.is_active !== true || (profile.role !== 'administrator' && profile.role !== 'manager')) {
    throw new Error('Unauthorized')
  }

  return {
    user,
    adminClient: createAdminClient(),
  }
}

/**
 * Validates total_uses or per_user_uses.
 * Valid values: -1 (unlimited) or any positive integer >= 1.
 */
function validateUsageLimit(value: number, label: string): string | null {
  if (!Number.isFinite(value)) return `${label} must be a valid number`
  if (value === -1) return null // unlimited — always valid
  if (!Number.isInteger(value) || value < 1) {
    return `${label} must be a positive integer, or -1 for unlimited`
  }
  return null
}

export async function createCoupon(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const { adminClient } = await verifyAdminRole()

    const name = String(formData.get('name') || '').trim()
    const code = parseCouponCode(String(formData.get('code') || ''))
    const discountType = String(formData.get('discountType') || '') as CouponDiscountType
    const discountValue = Number(formData.get('discountValue') || 0)
    const totalUses = Number(formData.get('totalUses'))
    const perUserUses = Number(formData.get('perUserUses'))
    const status = String(formData.get('status') || 'active') as CouponStatus

    if (!name) return { success: false, error: 'Coupon name is required' }
    if (!code) return { success: false, error: 'Coupon code is required' }
    if (!['percentage', 'amount'].includes(discountType)) {
      return { success: false, error: 'Discount type must be percentage or amount' }
    }
    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      return { success: false, error: 'Discount value must be a valid number greater than 0' }
    }
    if (discountType === 'percentage' && discountValue > 100) {
      return { success: false, error: 'Percentage discounts cannot exceed 100%' }
    }

    const totalUsesError = validateUsageLimit(totalUses, 'Total uses')
    if (totalUsesError) return { success: false, error: totalUsesError }

    const perUserUsesError = validateUsageLimit(perUserUses, 'Per-user uses')
    if (perUserUsesError) return { success: false, error: perUserUsesError }

    const { error } = await adminClient.from('coupons').insert({
      name,
      code,
      discount_type: discountType,
      discount_value: discountValue,
      total_uses: totalUses,
      used_count: 0,
      per_user_uses: perUserUses,
      status,
    })

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'A coupon with this code already exists. Please use a different code.' }
      }
      return { success: false, error: error.message }
    }

    revalidateTag('coupons', 'max')
    revalidatePathTyped('/admin/coupons', 'page')
    revalidatePathTyped('/admin', 'layout')
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred'
    return { success: false, error: message }
  }
}

export async function updateCoupon(id: string, formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const { adminClient } = await verifyAdminRole()

    const name = String(formData.get('name') || '').trim()
    const code = parseCouponCode(String(formData.get('code') || ''))
    const discountType = String(formData.get('discountType') || '') as CouponDiscountType
    const discountValue = Number(formData.get('discountValue') || 0)
    const totalUses = Number(formData.get('totalUses'))
    const perUserUses = Number(formData.get('perUserUses'))
    const status = String(formData.get('status') || 'active') as CouponStatus

    if (!name) return { success: false, error: 'Coupon name is required' }
    if (!code) return { success: false, error: 'Coupon code is required' }
    if (!['percentage', 'amount'].includes(discountType)) {
      return { success: false, error: 'Discount type must be percentage or amount' }
    }
    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      return { success: false, error: 'Discount value must be a valid number greater than 0' }
    }
    if (discountType === 'percentage' && discountValue > 100) {
      return { success: false, error: 'Percentage discounts cannot exceed 100%' }
    }

    const totalUsesError = validateUsageLimit(totalUses, 'Total uses')
    if (totalUsesError) return { success: false, error: totalUsesError }

    const perUserUsesError = validateUsageLimit(perUserUses, 'Per-user uses')
    if (perUserUsesError) return { success: false, error: perUserUsesError }

    const { error } = await adminClient
      .from('coupons')
      .update({
        name,
        code,
        discount_type: discountType,
        discount_value: discountValue,
        total_uses: totalUses,
        per_user_uses: perUserUses,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'A coupon with this code already exists. Please use a different code.' }
      }
      return { success: false, error: error.message }
    }

    revalidateTag('coupons', 'max')
    revalidatePathTyped('/admin/coupons', 'page')
    revalidatePathTyped('/admin', 'layout')
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred'
    return { success: false, error: message }
  }
}

export async function toggleCouponStatus(id: string, currentStatus: CouponStatus): Promise<{ success: boolean; error?: string }> {
  try {
    const { adminClient } = await verifyAdminRole()
    const nextStatus: CouponStatus = currentStatus === 'active' ? 'inactive' : 'active'

    const { error } = await adminClient
      .from('coupons')
      .update({
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidateTag('coupons', 'max')
    revalidatePathTyped('/admin/coupons', 'page')
    revalidatePathTyped('/admin', 'layout')
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred'
    return { success: false, error: message }
  }
}

export async function deleteCoupon(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { adminClient } = await verifyAdminRole()
    const now = new Date().toISOString()

    const { data: coupon, error: fetchError } = await adminClient
      .from('coupons')
      .select('id, status')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) {
      return { success: false, error: fetchError.message }
    }

    if (!coupon) {
      return { success: false, error: 'Coupon not found' }
    }

    if (coupon.status === 'deleted') {
      return { success: true }
    }

    const { error } = await adminClient
      .from('coupons')
      .update({
        status: 'deleted' as CouponStatus,
        updated_at: now,
      })
      .eq('id', id)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidateTag('coupons', 'max')
    revalidatePathTyped('/admin/coupons', 'page')
    revalidatePathTyped('/admin', 'layout')
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred'
    return { success: false, error: message }
  }
}
