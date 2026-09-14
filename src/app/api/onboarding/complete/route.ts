import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { REQUIRED_DOCUMENT_TYPES } from '@/lib/onboarding/document-slots';
import { sendWelcomeEmail } from '@/lib/onboarding/complete-onboarding';
import { createAdminNotification } from '@/lib/notifications/createAdminNotification';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims;

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ─── Verify all required documents are uploaded ──────────────────────────
  const { data: uploadedDocs } = await (supabase
    .from('documents')
    .select('document_type')
    .eq('profile_id', user.sub) as any);

  const uploadedTypes = (uploadedDocs ?? []).map((d: any) => d.document_type);
  const missingDocs = REQUIRED_DOCUMENT_TYPES.filter((t) => !uploadedTypes.includes(t));

  if (missingDocs.length > 0) {
    return NextResponse.json(
      { error: 'Missing required documents', missing: missingDocs },
      { status: 422 }
    );
  }

  // ─── Mark onboarding complete ────────────────────────────────────────────
  const { error: updateError } = await ((supabase
    .from('profiles') as any)
    .update({
      onboarding_completed: true,
      onboarding_step: 4,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.sub));

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // ─── Send welcome email (graceful — non-blocking) ────────────────────────
  const { data: profile } = await ((supabase
    .from('profiles') as any)
    .select('full_name')
    .eq('id', user.sub)
    .single());

  if (process.env.RESEND_API_KEY) {
    sendWelcomeEmail({
      name: profile?.full_name ?? 'Valued Customer',
      email: user.email!,
    }).catch(console.error); // never block completion on email failure
  }

  // ─── Notify admin (insert a notification row) ────────────────────────────
  // Awaited, not fire-and-forget: the previous version discarded the promise,
  // so the RLS rejection was never observed and admins silently lost these.
  // Service-role write — see createAdminNotification for why.
  const notifResult = await createAdminNotification({
    type: 'onboarding_completed',
    title: 'Onboarding Completed',
    body: `${user.email ?? 'A customer'} finished onboarding.`,
    link: '/admin/overview',
    payload: { profile_id: user.sub, email: user.email },
  });

  if (!notifResult.ok) {
    // Onboarding itself succeeded; the notification is secondary, so report
    // success to the customer while leaving a trace for operators.
    console.error('[onboarding/complete] admin notification failed', {
      profileId: user.sub,
      error: notifResult.error,
    });
  }

  return NextResponse.json({ success: true });
}
