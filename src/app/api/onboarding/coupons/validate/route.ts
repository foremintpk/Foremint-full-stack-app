import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateCoupon } from '@/lib/onboarding/coupons'

export async function POST(req: NextRequest) {
  try {
    const supabaseServer = await createServerClient()
    const { data: claimsData } = await supabaseServer.auth.getClaims()
    const user = claimsData?.claims

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json() as { code?: string; subtotal?: number }
    const code = body.code?.trim() || ''
    const subtotal = Number(body.subtotal || 0)

    const supabase = createAdminClient()
    const result = await validateCoupon(supabase, {
      code,
      userId: user.sub,
      subtotal,
    })

    if ('error' in result) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      coupon: result.coupon,
    })
  } catch (error) {
    console.error('[coupon validate] error:', error)
    return NextResponse.json(
      { success: false, error: 'Unable to validate coupon.' },
      { status: 500 }
    )
  }
}
