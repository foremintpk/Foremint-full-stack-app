import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'
import { validateCoupon } from '@/lib/onboarding/coupons'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(req: NextRequest) {
  try {
    const supabaseServer = await createServerClient()
    const { data: { user } } = await supabaseServer.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json() as { code?: string; subtotal?: number }
    const code = body.code?.trim() || ''
    const subtotal = Number(body.subtotal || 0)

    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const result = await validateCoupon(supabase, {
      code,
      userId: user.id,
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
