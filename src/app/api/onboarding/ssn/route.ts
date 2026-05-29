import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET || 'fallback-secret-at-least-32-chars-long-!!!';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SSN_REGEX = /^\d{3}-\d{2}-\d{4}$|^\d{9}$/;

function encrypt(text: string) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_SECRET.padEnd(32).slice(0, 32)), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export async function POST(req: NextRequest) {
  try {
    const { temp_session_key, ssn } = await req.json();

    if (!temp_session_key || !UUID_REGEX.test(temp_session_key)) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
    }

    if (!ssn || !SSN_REGEX.test(ssn)) {
      return NextResponse.json({ error: 'Invalid SSN format' }, { status: 400 });
    }

    const encrypted = encrypt(ssn);

    const { error } = await supabaseAdmin
      .from('onboarding_sensitive_data')
      .insert({
        temp_session_key,
        field_name: 'ssn',
        encrypted_value: encrypted
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
