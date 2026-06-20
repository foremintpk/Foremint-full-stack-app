/**
 * GET /api/public/tags
 * Returns all blog tags. Public — no auth required.
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { corsHeaders, corsPreflight } from '@/lib/blog/cors';

export const dynamic = 'force-dynamic';

export function OPTIONS(request: Request) {
  return corsPreflight(request);
}

export async function GET(request: Request) {
  try {
    const adminSdk = createAdminClient();
    const { data, error } = await (adminSdk as any)
      .from('blog_tags')
      .select('id, name, slug')
      .order('name');

    if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders(request) });

    return NextResponse.json(
      { tags: data ?? [] },
      { headers: corsHeaders(request, { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' }) }
    );
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders(request) });
  }
}
