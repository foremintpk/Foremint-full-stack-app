/**
 * GET /api/public/blogs/:slug
 * Returns a single published blog post by slug — full content included.
 * No admin fields, no draft content.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { PublicBlogPost } from '@/types/admin';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const adminSdk = createAdminClient();

    const { data, error } = await (adminSdk as any)
      .from('blog_posts')
      .select(`
        id, title, slug, excerpt, featured_image_url, featured_image_alt,
        author, category_id, published_at, reading_time_minutes, word_count,
        content, meta_title, meta_description, focus_keyword, canonical_url,
        og_title, og_description, og_image, twitter_title, twitter_description, twitter_image,
        answer_summary, primary_entity, key_takeaways, faqs, structured_data,
        blog_categories(name, slug),
        blog_post_tags(blog_tags(name, slug))
      `)
      .eq('slug', slug)
      .eq('status', 'published')
      .lte('published_at', new Date().toISOString())
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const cats = data.blog_categories as { name: string; slug: string } | null;
    const tagRows = (data.blog_post_tags as Array<{ blog_tags: { name: string; slug: string } }>) ?? [];

    const post: PublicBlogPost = {
      id: data.id,
      title: data.title,
      slug: data.slug,
      excerpt: data.excerpt,
      featuredImageUrl: data.featured_image_url ?? null,
      featuredImageAlt: data.featured_image_alt ?? null,
      author: data.author,
      categoryName: cats?.name ?? null,
      categorySlug: cats?.slug ?? null,
      tags: tagRows.map(t => ({ name: t.blog_tags.name, slug: t.blog_tags.slug })),
      publishedAt: data.published_at,
      readingTimeMinutes: data.reading_time_minutes ?? 1,
      wordCount: data.word_count ?? 0,
      content: data.content ?? '',
      metaTitle: data.meta_title ?? null,
      metaDescription: data.meta_description ?? null,
      focusKeyword: data.focus_keyword ?? null,
      canonicalUrl: data.canonical_url ?? null,
      ogTitle: data.og_title ?? null,
      ogDescription: data.og_description ?? null,
      ogImage: data.og_image ?? null,
      twitterTitle: data.twitter_title ?? null,
      twitterDescription: data.twitter_description ?? null,
      twitterImage: data.twitter_image ?? null,
      answerSummary: data.answer_summary ?? null,
      primaryEntity: data.primary_entity ?? null,
      keyTakeaways: data.key_takeaways ?? [],
      faqs: data.faqs ?? [],
      structuredData: data.structured_data ?? null,
    };

    return NextResponse.json(
      { post },
      {
        headers: {
          'Cache-Control': 'public, max-age=120, stale-while-revalidate=300',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
