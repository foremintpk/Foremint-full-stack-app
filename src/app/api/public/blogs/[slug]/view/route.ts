/**
 * POST /api/public/blogs/:slug/view
 * Records one view for a published post (powers Most read / Popular / Trending).
 * Fully automatic — the frontend calls this once when a post page loads.
 * No-op for unknown or unpublished slugs. Public, no auth.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { corsHeaders, corsPreflight } from '@/lib/blog/cors';

export const dynamic = 'force-dynamic';

export function OPTIONS(request: Request) {
  return corsPreflight(request);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const headers = corsHeaders(request);
  try {
    const { slug } = await params;
    const adminSdk = createAdminClient();
    // Atomic insert + counter increment; silently no-ops if not published.
    const { error } = await (adminSdk as any).rpc('record_blog_view', { p_slug: slug });
    return NextResponse.json({ ok: !error }, { status: 200, headers });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200, headers });
  }
}
