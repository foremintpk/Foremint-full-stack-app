import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  // If OAuth failed, return to Step 6 with error
  if (error || !code) {
    return NextResponse.redirect(
      new URL('/onboarding/step/6?error=oauth_failed', req.url)
    );
  }

  const supabase = await createClient();

  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError || !data.session) {
    return NextResponse.redirect(
      new URL('/onboarding/step/6?error=oauth_failed', req.url)
    );
  }

  // Link draft to authenticated user
  const tempSessionKey = req.cookies.get('foremint_temp_session_key')?.value || req.cookies.get('foremint_session_key')?.value;
  if (tempSessionKey && data.session.user) {
    try {
      const adminClient = createAdminClient();
      await adminClient
        .from('onboarding_drafts')
        .update({ user_id: data.session.user.id })
        .eq('temp_session_key', tempSessionKey);
    } catch (linkErr) {
      console.error("Failed to link draft during OAuth callback:", linkErr);
    }
  }

  // ALWAYS redirect back to onboarding — NEVER to dashboard
  const redirectTo = new URL('/onboarding/step/6', req.url);
  redirectTo.searchParams.set('auth_complete', 'true');

  return NextResponse.redirect(redirectTo);
}
