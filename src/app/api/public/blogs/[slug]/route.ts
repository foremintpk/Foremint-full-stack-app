/**
 * GET /api/public/blogs/:slug
 * Returns a single published blog post by slug — full HTML content, structured
 * content JSON, auto-generated Table of Contents, FAQ, SEO and related posts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { PublicBlogPost, PublicBlogSummary, BlogTocEntry } from '@/types/admin';
import { corsHeaders, corsPreflight } from '@/lib/blog/cors';
import { extractCategories } from '@/lib/blog/publicBlogs';

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
    const adminSdk = createAdminClient();

    const { data, error } = await (adminSdk as any)
      .from('blog_posts')
      .select(`
        id, title, slug, excerpt, featured_image_url, featured_image_alt,
        author, category_id, published_at, reading_time_minutes, word_count, is_featured, view_count,
        content, content_html, content_json, toc,
        meta_title, meta_description, focus_keyword, canonical_url,
        og_title, og_description, og_image, twitter_title, twitter_description, twitter_image,
        answer_summary, primary_entity, key_takeaways, faqs, structured_data,
        blog_categories!category_id(name, slug, color),
        blog_post_categories(blog_categories(name, slug, color)),
        blog_post_tags(blog_tags(name, slug))
      `)
      .eq('slug', slug)
      .eq('status', 'published')
      .lte('published_at', new Date().toISOString())
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404, headers: corsHeaders(request) });
    }

    const cat = data.blog_categories as { name: string; slug: string; color: string | null } | null;
    const tagRows = (data.blog_post_tags as Array<{ blog_tags: { name: string; slug: string } }>) ?? [];

    // ── Related posts: same category first, then recent, excluding self ──
    const relatedBlogs = await fetchRelated(adminSdk, data.id as string, data.category_id as string | null);

    const post: PublicBlogPost = {
      id: data.id,
      title: data.title,
      slug: data.slug,
      excerpt: data.excerpt,
      featuredImageUrl: data.featured_image_url ?? null,
      featuredImageAlt: data.featured_image_alt ?? null,
      author: data.author,
      categoryName: cat?.name ?? null,
      categorySlug: cat?.slug ?? null,
      categoryColor: cat?.color ?? null,
      categories: extractCategories(data as Record<string, unknown>),
      isFeatured: data.is_featured ?? false,
      viewCount: data.view_count ?? 0,
      tags: tagRows.map(t => ({ name: t.blog_tags.name, slug: t.blog_tags.slug })),
      publishedAt: data.published_at,
      readingTimeMinutes: data.reading_time_minutes ?? 1,
      wordCount: data.word_count ?? 0,
      content: data.content ?? '',
      contentHtml: data.content_html ?? data.content ?? '',
      contentJson: data.content_json ?? null,
      toc: (data.toc as BlogTocEntry[]) ?? [],
      relatedBlogs,
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
      { headers: corsHeaders(request, { 'Cache-Control': 'public, max-age=120, stale-while-revalidate=300' }) }
    );
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders(request) });
  }
}

async function fetchRelated(
  adminSdk: ReturnType<typeof createAdminClient>,
  excludeId: string,
  categoryId: string | null,
): Promise<PublicBlogSummary[]> {
  const cols = `id, title, slug, excerpt, featured_image_url, featured_image_alt,
                published_at, reading_time_minutes, blog_categories!category_id(name, slug)`;
  const now = new Date().toISOString();

  const map = (rows: Array<Record<string, unknown>>): PublicBlogSummary[] =>
    rows.map((r) => {
      const c = r.blog_categories as { name: string; slug: string } | null;
      return {
        id: r.id as string,
        title: r.title as string,
        slug: r.slug as string,
        excerpt: r.excerpt as string,
        featuredImageUrl: (r.featured_image_url as string) ?? null,
        featuredImageAlt: (r.featured_image_alt as string) ?? null,
        categoryName: c?.name ?? null,
        categorySlug: c?.slug ?? null,
        readingTimeMinutes: (r.reading_time_minutes as number) ?? 1,
        publishedAt: r.published_at as string,
      };
    });

  const collected: PublicBlogSummary[] = [];
  const seen = new Set<string>([excludeId]);

  if (categoryId) {
    const { data } = await (adminSdk as any)
      .from('blog_posts').select(cols)
      .eq('status', 'published').lte('published_at', now)
      .eq('category_id', categoryId).neq('id', excludeId)
      .order('published_at', { ascending: false }).limit(3);
    for (const item of map((data as Array<Record<string, unknown>>) || [])) {
      if (!seen.has(item.id)) { collected.push(item); seen.add(item.id); }
    }
  }

  if (collected.length < 3) {
    const { data } = await (adminSdk as any)
      .from('blog_posts').select(cols)
      .eq('status', 'published').lte('published_at', now)
      .neq('id', excludeId)
      .order('published_at', { ascending: false }).limit(6);
    for (const item of map((data as Array<Record<string, unknown>>) || [])) {
      if (collected.length >= 3) break;
      if (!seen.has(item.id)) { collected.push(item); seen.add(item.id); }
    }
  }

  return collected;
}
