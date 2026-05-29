import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { linkDraftToUser } from '@/lib/onboarding/linkDraftToUser'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { temp_session_key } = await req.json()

  if (!temp_session_key || !UUID_REGEX.test(temp_session_key)) {
    return NextResponse.json({ error: 'Invalid session key' }, { status: 400 })
  }

  try {
    await linkDraftToUser(temp_session_key, user.id)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('link draft error:', err)
    return NextResponse.json({ error: 'Failed to link draft' }, { status: 500 })
  }
}
