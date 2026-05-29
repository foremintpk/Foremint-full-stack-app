import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { linkDraftToUser } from '@/lib/onboarding/linkDraftToUser'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/onboarding/step/6'
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(
      new URL('/onboarding/step/5?error=oauth_failed', request.url)
    )
  }

  const supabase = await createClient()
  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError || !data.session?.user) {
    return NextResponse.redirect(
      new URL('/onboarding/step/5?error=oauth_failed', request.url)
    )
  }

  const tempSessionKey =
    request.cookies.get('foremint_temp_session_key')?.value ??
    request.cookies.get('foremint_session_key')?.value

  if (tempSessionKey) {
    try {
      await linkDraftToUser(tempSessionKey, data.session.user.id)
    } catch (linkErr) {
      console.error('Failed to link draft during auth callback:', linkErr)
    }
  }

  const redirectTo = new URL(next.startsWith('/') ? next : `/${next}`, origin)
  redirectTo.searchParams.set('auth_complete', 'true')

  return NextResponse.redirect(redirectTo)
}
