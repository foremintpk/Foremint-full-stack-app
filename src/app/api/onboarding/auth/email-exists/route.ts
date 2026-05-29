import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')?.trim().toLowerCase()

  if (!email) {
    return NextResponse.json({ exists: false })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('profiles')
    .select('id')
    .ilike('email', email)
    .limit(1)

  if (error) {
    return NextResponse.json({ error: 'Unable to check email.' }, { status: 500 })
  }

  return NextResponse.json({ exists: (data?.length ?? 0) > 0 })
}
