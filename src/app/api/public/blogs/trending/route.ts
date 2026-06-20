/**
 * GET /api/public/blogs/trending
 * Returns posts ranked by views within a recent window (default 7 days).
 * Falls back to all-time most-viewed, then newest, so the list is never empty
 * on a fresh site. Fully automatic — derived from recorded views, no admin input.
 *
 * Query params: days (default 7), limit (default 5, max 20).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PUBLIC_LIST_COLUMNS, mapPublicListRow } from '@/lib/blog/publicBlogs';
import { corsHeaders, corsPreflight } from '@/lib/blog/cors';
import type { PublicBlogPost } from '@/types/admin';

export const dynamic = 'force-dynamic';

export function OPTIONS(request: Request) {
  return corsPreflight(request);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const days = Math.max(1, parseInt(searchParams.get('days') ?? '7', 10) || 7);
    const limit = Math.min(20, Math.max(1, parseInt(searchParams.get('limit') ?? '5', 10) || 5));

    const adminSdk = createAdminClient();
    const now = new Date().toISOString();

    // 1) Recent-window trending ids (most views in the last `days` days).
    const { data: trendingRows } = await (adminSdk as any)
      .rpc('get_trending_blog_ids', { p_days: days, p_limit: limit });
    const orderedIds: string[] = ((trendingRows ?? []) as Array<{ post_id: string }>).map(r => r.post_id);

    // 2) Fallback fill: all-time most-viewed, then newest, excluding ids already chosen.
    if (orderedIds.length < limit) {
      const { data: fillRows } = await (adminSdk as any)
        .from('blog_posts')
        .select('id')
        .eq('status', 'published')
        .lte('published_at', now)
        .order('view_count', { ascending: false })
        .order('published_at', { ascending: false })
        .limit(limit * 3);
      for (const r of (fillRows ?? []) as Array<{ id: string }>) {
        if (orderedIds.length >= limit) break;
        if (!orderedIds.includes(r.id)) orderedIds.push(r.id);
      }
    }

    if (orderedIds.length === 0) {
      return NextResponse.json({ posts: [] }, { headers: cacheHeaders(request) });
    }

    // 3) Fetch full cards for the chosen ids, then restore the ranked order.
    const { data, error } = await (adminSdk as any)
      .from('blog_posts')
      .select(PUBLIC_LIST_COLUMNS)
      .in('id', orderedIds)
      .eq('status', 'published')
      .lte('published_at', now);
    if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders(request) });

    const byId = new Map<string, PublicBlogPost>();
    for (const row of (data ?? []) as Array<Record<string, unknown>>) {
      byId.set(row.id as string, mapPublicListRow(row));
    }
    const posts = orderedIds.map(id => byId.get(id)).filter((p): p is PublicBlogPost => !!p);

    return NextResponse.json({ posts }, { headers: cacheHeaders(request) });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders(request) });
  }
}

function cacheHeaders(request: Request) {
  return corsHeaders(request, { 'Cache-Control': 'public, max-age=120, stale-while-revalidate=300' });
}
