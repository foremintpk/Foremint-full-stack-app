import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { revalidateTag } from 'next/cache'
import {
  sendOrderConfirmationEmail,
  sendAdminOrderNotificationEmail,
} from '@/lib/email/sendOrderConfirmation'
import { mergeFormDataFromSteps } from '@/lib/onboarding/mergeFormData'
import {
  validateCoupon,
  recordCouponUsage,
  type ResolvedCoupon,
} from '@/lib/onboarding/coupons'
import {
  syncMemberDocumentsToDatabase,
  syncPaymentReceiptToDatabase,
} from '@/lib/onboarding/syncMemberDocuments'
import type { OrderSubmissionPayload, OrderSubmissionResult } from '@/types/onboarding'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(
  req: NextRequest
): Promise<NextResponse<OrderSubmissionResult>> {
  try {
    const supabase = await createServerClient()
    const payload = (await req.json()) as OrderSubmissionPayload

    const { userId, receiptUrl, tempSessionKey } = payload

    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    const { data: draft, error: draftError } = await admin
      .from('onboarding_drafts')
      .select('id, status, form_data')
      .eq('temp_session_key', tempSessionKey)
      .single()

    if (draftError || !draft) {
      return NextResponse.json(
        { success: false, error: 'Draft not found.' },
        { status: 404 }
      )
    }

    if (draft.status === 'completed') {
      return NextResponse.json(
        { success: false, error: 'Order has already been submitted.' },
        { status: 400 }
      )
    }

    const formDataByStep = draft.form_data as Record<number, unknown>
    const step7 = (formDataByStep[7] ?? {}) as Record<string, unknown>
    if (payload.formData.paymentMethod) {
      step7.paymentMethod = payload.formData.paymentMethod
    }
    if (receiptUrl) {
      step7.receiptUrl = receiptUrl
      step7.receiptPublicId = payload.receiptPublicId
      step7.receiptFileName = payload.formData.receiptFileName
    }
    formDataByStep[7] = step7

    const formData = mergeFormDataFromSteps(formDataByStep)

    const subtotal =
      formData.stateFee + formData.packagePrice + (formData.addonTotal ?? 0)

    let couponDiscountAmount = Number(formData.couponDiscountAmount ?? 0) || 0
    let couponCode = formData.couponCode ?? null
    let couponName = formData.couponName ?? null
    let couponDiscountType = formData.couponDiscountType ?? null
    let couponDiscountValue = Number(formData.couponDiscountValue ?? 0) || null
    let validatedCoupon: ResolvedCoupon | null = null

    if (couponCode) {
      const couponResult = await validateCoupon(admin, {
        code: couponCode,
        userId,
        subtotal,
      })

      if ('error' in couponResult) {
        return NextResponse.json(
          { success: false, error: couponResult.error },
          { status: 400 }
        )
      }

      couponDiscountAmount = couponResult.coupon.discountAmount
      couponCode = couponResult.coupon.code
      couponName = couponResult.coupon.name
      couponDiscountType = couponResult.coupon.discountType
      couponDiscountValue = couponResult.coupon.discountValue
      validatedCoupon = couponResult.coupon
    } else {
      couponDiscountAmount = 0
    }

    const grandTotal = Math.max(0, subtotal - couponDiscountAmount)

    const formSnapshot = {
      entityType: formData.entityType,
      memberType: formData.memberType,
      businessName: formData.businessName,
      secondaryBusinessName: formData.secondaryBusinessName,
      businessWebsite: formData.businessWebsite,
      businessCategory: formData.businessCategory,
      businessDescription: formData.businessDescription,
      members: formData.members ?? [],
      fullName: formData.members?.[0]?.fullName ?? '',
      email: user.email ?? '',
      coupon: couponCode ? {
        code: couponCode,
        name: couponName,
        discountType: couponDiscountType,
        discountValue: couponDiscountValue,
        discountAmount: couponDiscountAmount,
      } : null,
    }

    const addonsSnapshot = (formData.selectedAddons ?? []).map(a => ({
      id: a.id,
      name: a.name,
      price: a.price,
    }))

    const pricingSnapshot = {
      stateFee: formData.stateFee,
      packagePrice: formData.packagePrice,
      packageName: formData.selectedPackageName,
      addonTotal: formData.addonTotal ?? 0,
      couponCode,
      couponName,
      couponDiscountType,
      couponDiscountValue,
      couponDiscountAmount,
      subtotal,
      grandTotal,
    }

    const { data: order, error: orderError } = await admin
      .from('orders')
      .insert({
        user_id: userId,
        order_type: 'llc',
        entity_type: formData.entityType,
        member_type: formData.memberType,
        formation_state: formData.formationState,
        formation_state_name: formData.formationStateName,
        formation_package: formData.selectedPackageId,
        state_fee: formData.stateFee,
        package_price: formData.packagePrice,
        addons_total: formData.addonTotal ?? 0,
        grand_total: grandTotal,
        discount_pkr: couponDiscountAmount,
        amount: grandTotal,
        status: 'pending',
        payment_status: grandTotal === 0 ? 'paid' : receiptUrl ? 'partial' : 'unpaid',
        payment_method: formData.paymentMethod,
        payment_receipt_url: receiptUrl ?? null,
        selected_addons: (formData.selectedAddons ?? []).map(a => a.id),
        addons_snapshot: addonsSnapshot,
        pricing_snapshot: pricingSnapshot,
        form_snapshot: formSnapshot,
        draft_id: draft.id,
        submitted_at: new Date().toISOString(),
      })
      .select('id, order_number')
      .single()

    if (orderError || !order) {
      console.error('Order insert error:', orderError)
      return NextResponse.json(
        { success: false, error: 'Failed to create order.' },
        { status: 500 }
      )
    }

    if (couponCode) {
      const usageResult = await recordCouponUsage(admin, {
        coupon: validatedCoupon ?? {
          id: formData.couponId ?? '',
          name: couponName ?? couponCode,
          code: couponCode,
          discountType: couponDiscountType ?? 'amount',
          discountValue: couponDiscountValue ?? 0,
          discountAmount: couponDiscountAmount,
          totalUses: 0,
          usedCount: 0,
          perUserUses: 0,
          status: 'active',
        },
        userId,
        orderId: order.id,
      })

      if ('error' in usageResult) {
        console.error('Failed to record coupon usage:', usageResult.error)
      } else {
        revalidateTag('coupons', 'max')
      }
    }

    await syncMemberDocumentsToDatabase(admin, {
      profileId: userId,
      orderId: order.id,
      members: formData.members ?? [],
    })

    const receiptToSync = receiptUrl ?? formData.receiptUrl
    if (receiptToSync) {
      await syncPaymentReceiptToDatabase(admin, {
        profileId: userId,
        orderId: order.id,
        receiptUrl: receiptToSync,
        receiptPublicId: payload.receiptPublicId ?? formData.receiptPublicId,
        receiptFileName: formData.receiptFileName,
      })
    }

    await admin
      .from('onboarding_drafts')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('temp_session_key', tempSessionKey)

    const businessName = formData.businessName || 'Unnamed Business'
    const { data: profile } = await admin
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single()

    const userName = profile?.full_name ?? user.email ?? 'A customer'

    const { error: notifError } = await admin.from('notifications').insert({
      type: 'new_llc_order',
      target_role: 'administrator',
      title: 'New LLC Order',
      body: `${userName} created a new LLC order for ${businessName}`,
      link: `/admin/llc-registrations/${order.id}`,
      is_read: false,
    })

    if (notifError) {
      console.error('Admin notification insert failed:', notifError)
    }

    revalidateTag(`customer-dashboard-${userId}`, 'max')
    revalidateTag(`notif-list-${userId}`, 'max')
    revalidateTag(`order-list-${userId}`, 'max')
    revalidateTag(`llc-detail-${order.id}`, 'max')
    revalidateTag(`order-${order.id}`, 'max')
    revalidateTag('notif-count-admin', 'max')
    revalidateTag('notif-list-admin', 'max')
    revalidateTag('overview-stats', 'max')

    const orderDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    const orderRef = order.order_number ?? order.id
    const customerName = profile?.full_name ?? user.email ?? 'Valued Customer'

    // ── Customer confirmation email (non-blocking) ──────────────────────────
    sendOrderConfirmationEmail({
      to: user.email!,
      userName: customerName,
      orderNumber: orderRef,
      businessName,
      grandTotal,
      packageName: formData.selectedPackageName ?? '',
      formationState: formData.formationStateName ?? '',
      orderDate,
    }).catch(err => console.error('[Email] Customer confirmation failed:', err))

    // ── Admin notification email (non-blocking) ─────────────────────────────
    sendAdminOrderNotificationEmail({
      customerName,
      customerEmail: user.email!,
      orderId: order.id,
      orderNumber: orderRef,
      serviceName: formData.selectedPackageName ?? '',
      businessName,
      formationState: formData.formationStateName ?? '',
      grandTotal,
      orderDate,
    }).catch(err => console.error('[Email] Admin notification failed:', err))

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.order_number ?? undefined,
    })
  } catch (err) {
    console.error('create-order error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error.' },
      { status: 500 }
    )
  }
}
