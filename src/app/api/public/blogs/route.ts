/**
 * GET /api/public/blogs
 * Public headless CMS endpoint — returns published blog posts only.
 * No admin fields. No draft content. No internal metadata.
 * Consumed by the future foremint.com frontend.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { PublicBlogPost } from '@/types/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') ?? '10', 10)));
    const category = searchParams.get('category');
    const tag = searchParams.get('tag');
    const q = searchParams.get('q');

    const adminSdk = createAdminClient();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = (adminSdk as any)
      .from('blog_posts')
      .select(`
        id, title, slug, excerpt, featured_image_url, featured_image_alt,
        author, category_id, published_at, reading_time_minutes, word_count,
        meta_title, meta_description, focus_keyword, canonical_url,
        og_title, og_description, og_image, twitter_title, twitter_description, twitter_image,
        answer_summary, primary_entity, key_takeaways, faqs, structured_data,
        blog_categories(name, slug),
        blog_post_tags(blog_tags(name, slug))
      `, { count: 'exact' })
      .eq('status', 'published')
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false })
      .range(from, to);

    if (category) query = query.eq('blog_categories.slug', category);
    if (q) query = query.ilike('title', `%${q}%`);

    const { data, error, count } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const posts: PublicBlogPost[] = (data || []).map((row: Record<string, unknown>) => {
      const cats = row.blog_categories as { name: string; slug: string } | null;
      const tagRows = (row.blog_post_tags as Array<{ blog_tags: { name: string; slug: string } }>) ?? [];
      return {
        id: row.id as string,
        title: row.title as string,
        slug: row.slug as string,
        excerpt: row.excerpt as string,
        featuredImageUrl: (row.featured_image_url as string) ?? null,
        featuredImageAlt: (row.featured_image_alt as string) ?? null,
        author: row.author as string,
        categoryName: cats?.name ?? null,
        categorySlug: cats?.slug ?? null,
        tags: tagRows.map(t => ({ name: t.blog_tags.name, slug: t.blog_tags.slug })),
        publishedAt: row.published_at as string,
        readingTimeMinutes: (row.reading_time_minutes as number) ?? 1,
        wordCount: (row.word_count as number) ?? 0,
        content: '', // content omitted in listing — fetch individual post for full content
        metaTitle: (row.meta_title as string) ?? null,
        metaDescription: (row.meta_description as string) ?? null,
        focusKeyword: (row.focus_keyword as string) ?? null,
        canonicalUrl: (row.canonical_url as string) ?? null,
        ogTitle: (row.og_title as string) ?? null,
        ogDescription: (row.og_description as string) ?? null,
        ogImage: (row.og_image as string) ?? null,
        twitterTitle: (row.twitter_title as string) ?? null,
        twitterDescription: (row.twitter_description as string) ?? null,
        twitterImage: (row.twitter_image as string) ?? null,
        answerSummary: (row.answer_summary as string) ?? null,
        primaryEntity: (row.primary_entity as string) ?? null,
        keyTakeaways: (row.key_takeaways as string[]) ?? [],
        faqs: (row.faqs as PublicBlogPost['faqs']) ?? [],
        structuredData: (row.structured_data as Record<string, unknown>) ?? null,
      };
    });

    // Filter by tag in-memory (since Supabase M2M filter is complex)
    const filtered = tag
      ? posts.filter(p => p.tags.some(t => t.slug === tag))
      : posts;

    return NextResponse.json(
      { posts: filtered, total: count ?? 0, page, pageSize, totalPages: Math.ceil((count ?? 0) / pageSize) },
      {
        headers: {
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=120',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (err: unknown) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
