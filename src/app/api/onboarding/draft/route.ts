import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ─── GET DRAFT ──────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get('key');

  if (!key || !UUID_REGEX.test(key)) {
    return NextResponse.json({ error: 'Invalid session key' }, { status: 400 });
  }

  const { data: draft, error } = await supabaseAdmin
    .from('onboarding_drafts')
    .select('*')
    .eq('temp_session_key', key)
    .single();

  if (error || !draft) {
    return NextResponse.json({ draft: null });
  }

  // Check expiry
  if (new Date(draft.expires_at) < new Date()) {
    return NextResponse.json({ draft: null });
  }

  return NextResponse.json({ draft });
}

// ─── UPSERT DRAFT ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { temp_session_key, current_step, form_data, completed_steps } = body;

    if (!temp_session_key || !UUID_REGEX.test(temp_session_key)) {
      return NextResponse.json({ error: 'Invalid session key' }, { status: 400 });
    }

    // Sanitize form_data (strip sensitive fields)
    const sanitizedData = { ...form_data };
    const sensitiveFields = ['password', 'card_number', 'cvv', 'otp', 'ssn'];
    
    Object.keys(sanitizedData).forEach(step => {
      const stepData = sanitizedData[step];
      if (typeof stepData === 'object' && stepData !== null) {
        sensitiveFields.forEach(field => {
          if (field in stepData) delete (stepData as any)[field];
        });
      }
    });

    // Check if user is authenticated using the server-side client
    const supabaseServer = await createServerClient();
    const { data: claimsData } = await supabaseServer.auth.getClaims();
    const user = claimsData?.claims;

    const upsertPayload: any = {
      temp_session_key,
      current_step,
      form_data: sanitizedData,
      completed_steps,
      updated_at: new Date().toISOString(),
    };

    // If authenticated, preserve/assign their user_id
    if (user) {
      upsertPayload.user_id = user.sub;
    }

    const { data, error } = await supabaseAdmin
      .from('onboarding_drafts')
      .upsert(upsertPayload, { onConflict: 'temp_session_key' })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      draft_id: data.id, 
      updated_at: data.updated_at 
    });
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
