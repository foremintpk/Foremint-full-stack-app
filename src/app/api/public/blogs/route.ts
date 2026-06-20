/**
 * GET /api/public/blogs
 * Public headless CMS endpoint — returns published blog posts only.
 * No admin fields. No draft content. No internal metadata.
 * Consumed by the foremint.pk frontend.
 *
 * Query params: page, pageSize, category (slug), tag (slug), q (search),
 *               featured (true|false), sort (newest|oldest|title|popular).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { PublicBlogPost } from '@/types/admin';
import { PUBLIC_LIST_COLUMNS, mapPublicListRow } from '@/lib/blog/publicBlogs';
import { corsHeaders, corsPreflight } from '@/lib/blog/cors';

export const dynamic = 'force-dynamic';

export function OPTIONS(request: Request) {
  return corsPreflight(request);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') ?? '10', 10)));
    const category = searchParams.get('category');
    const tag = searchParams.get('tag');
    const q = searchParams.get('q');
    const featured = searchParams.get('featured');
    const sort = searchParams.get('sort') ?? 'newest';

    const adminSdk = createAdminClient();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = (adminSdk as any)
      .from('blog_posts')
      .select(PUBLIC_LIST_COLUMNS, { count: 'exact' })
      .eq('status', 'published')
      .lte('published_at', new Date().toISOString());

    if (category) query = query.eq('blog_categories.slug', category);
    if (q) query = query.or(`title.ilike.%${q}%,excerpt.ilike.%${q}%`);
    if (featured === 'true') query = query.eq('is_featured', true);

    // Sorting
    if (sort === 'oldest') query = query.order('published_at', { ascending: true });
    else if (sort === 'title') query = query.order('title', { ascending: true });
    else if (sort === 'popular') query = query.order('view_count', { ascending: false }).order('published_at', { ascending: false });
    else query = query.order('published_at', { ascending: false });

    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders(request) });

    let posts = (data || []).map((row: Record<string, unknown>) => mapPublicListRow(row));

    // Tag filter applied in-memory (Supabase M2M filtering is awkward via the SDK).
    if (tag) posts = posts.filter((p: PublicBlogPost) => p.tags.some(t => t.slug === tag));

    return NextResponse.json(
      { posts, total: count ?? 0, page, pageSize, totalPages: Math.ceil((count ?? 0) / pageSize) },
      { headers: corsHeaders(request, { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=120' }) }
    );
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders(request) });
  }
}
