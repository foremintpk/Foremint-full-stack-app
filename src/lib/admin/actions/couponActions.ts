'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { CouponDiscountType, CouponStatus } from '@/types/admin'

const revalidatePathTyped = revalidatePath as unknown as (path: string, type?: 'layout' | 'page') => void
const revalidateTagTyped = revalidateTag as unknown as (tag: string) => void

function parseCouponCode(raw: string): string {
  return raw.trim().toUpperCase()
}

async function verifyAdminRole() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'administrator' && profile.role !== 'manager')) {
    throw new Error('Unauthorized')
  }

  return supabase
}

export async function createCoupon(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await verifyAdminRole()

    const name = String(formData.get('name') || '').trim()
    const code = parseCouponCode(String(formData.get('code') || ''))
    const discountType = String(formData.get('discountType') || '') as CouponDiscountType
    const discountValue = Number(formData.get('discountValue') || 0)
    const totalUses = Number(formData.get('totalUses') || 0)
    const perUserUses = Number(formData.get('perUserUses') || 0)
    const status = String(formData.get('status') || 'active') as CouponStatus

    if (!name) return { success: false, error: 'Coupon name is required' }
    if (!code) return { success: false, error: 'Coupon code is required' }
    if (!['percentage', 'amount'].includes(discountType)) {
      return { success: false, error: 'Discount type must be percentage or amount' }
    }
    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      return { success: false, error: 'Discount value must be a valid number greater than 0' }
    }
    if (!Number.isFinite(totalUses) || totalUses <= 0) {
      return { success: false, error: 'Total uses must be a valid number greater than 0' }
    }
    if (!Number.isFinite(perUserUses) || perUserUses <= 0) {
      return { success: false, error: 'Per-user uses must be a valid number greater than 0' }
    }
    if (discountType === 'percentage' && discountValue > 100) {
      return { success: false, error: 'Percentage discounts cannot exceed 100%' }
    }

    const { error } = await supabase.from('coupons').insert({
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
      return { success: false, error: error.message }
    }

    revalidateTagTyped('coupons')
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
    const supabase = await verifyAdminRole()

    const name = String(formData.get('name') || '').trim()
    const code = parseCouponCode(String(formData.get('code') || ''))
    const discountType = String(formData.get('discountType') || '') as CouponDiscountType
    const discountValue = Number(formData.get('discountValue') || 0)
    const totalUses = Number(formData.get('totalUses') || 0)
    const perUserUses = Number(formData.get('perUserUses') || 0)
    const status = String(formData.get('status') || 'active') as CouponStatus

    if (!name) return { success: false, error: 'Coupon name is required' }
    if (!code) return { success: false, error: 'Coupon code is required' }
    if (!['percentage', 'amount'].includes(discountType)) {
      return { success: false, error: 'Discount type must be percentage or amount' }
    }
    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      return { success: false, error: 'Discount value must be a valid number greater than 0' }
    }
    if (!Number.isFinite(totalUses) || totalUses <= 0) {
      return { success: false, error: 'Total uses must be a valid number greater than 0' }
    }
    if (!Number.isFinite(perUserUses) || perUserUses <= 0) {
      return { success: false, error: 'Per-user uses must be a valid number greater than 0' }
    }
    if (discountType === 'percentage' && discountValue > 100) {
      return { success: false, error: 'Percentage discounts cannot exceed 100%' }
    }

    const { error } = await supabase
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
      return { success: false, error: error.message }
    }

    revalidateTagTyped('coupons')
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
    const supabase = await verifyAdminRole()
    const nextStatus: CouponStatus = currentStatus === 'active' ? 'inactive' : 'active'

    const { error } = await supabase
      .from('coupons')
      .update({
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidateTagTyped('coupons')
    revalidatePathTyped('/admin/coupons', 'page')
    revalidatePathTyped('/admin', 'layout')
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred'
    return { success: false, error: message }
  }
}
