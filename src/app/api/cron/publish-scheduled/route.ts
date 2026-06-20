/**
 * GET /api/cron/publish-scheduled
 * Promotes scheduled blog posts to "published" once their publish_date is due.
 * Triggered by Vercel Cron. Protected by CRON_SECRET.
 */

import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { revalidateTag } from 'next/cache';

export const dynamic = 'force-dynamic';

function getAdminSdk() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase service-role credentials');
  return createSupabaseClient(url, key, { auth: { persistSession: false } });
}

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sdk = getAdminSdk();
  const now = new Date().toISOString();

  // Find scheduled posts whose publish time has arrived.
  const { data: due, error: fetchErr } = await sdk
    .from('blog_posts')
    .select('id, publish_date')
    .eq('status', 'scheduled')
    .lte('publish_date', now);

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  const ids = (due ?? []).map((d) => d.id as string);
  let publishedCount = 0;

  for (const row of due ?? []) {
    const { error } = await sdk
      .from('blog_posts')
      .update({
        status: 'published',
        published_at: (row.publish_date as string) ?? now,
        updated_at: now,
      })
      .eq('id', row.id as string);
    if (!error) {
      publishedCount++;
      revalidateTag(`blog-post-${row.id}`, 'max');
    }
  }

  if (publishedCount > 0) revalidateTag('blog-list', 'max');

  return NextResponse.json({ ok: true, checked: ids.length, published: publishedCount, at: now });
}
