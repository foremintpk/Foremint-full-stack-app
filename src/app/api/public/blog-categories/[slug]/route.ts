/**
 * GET /api/public/blog-categories/:slug
 * Returns a single active category plus its paginated published posts.
 *
 * Query params: page, pageSize.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PUBLIC_LIST_COLUMNS, mapPublicListRow } from '@/lib/blog/publicBlogs';
import { corsHeaders, corsPreflight } from '@/lib/blog/cors';

export const dynamic = 'force-dynamic';

export function OPTIONS(request: Request) {
  return corsPreflight(request);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') ?? '10', 10)));

    const adminSdk = createAdminClient();

    const { data: category } = await (adminSdk as any)
      .from('blog_categories')
      .select('id, name, slug, description, color, sort_order')
      .eq('slug', slug)
      .is('deleted_at', null)
      .eq('is_active', true)
      .maybeSingle();

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404, headers: corsHeaders(request) });
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await (adminSdk as any)
      .from('blog_posts')
      .select(PUBLIC_LIST_COLUMNS, { count: 'exact' })
      .eq('status', 'published')
      .lte('published_at', new Date().toISOString())
      .eq('category_id', category.id)
      .order('published_at', { ascending: false })
      .range(from, to);

    if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders(request) });

    const posts = (data || []).map((row: Record<string, unknown>) => mapPublicListRow(row));

    return NextResponse.json(
      {
        category: {
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description ?? null,
          color: category.color ?? null,
          postCount: count ?? 0,
        },
        posts,
        total: count ?? 0,
        page,
        pageSize,
        totalPages: Math.ceil((count ?? 0) / pageSize),
      },
      { headers: corsHeaders(request, { 'Cache-Control': 'public, max-age=120, stale-while-revalidate=300' }) }
    );
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders(request) });
  }
}
