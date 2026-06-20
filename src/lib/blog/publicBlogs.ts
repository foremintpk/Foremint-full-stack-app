/**
 * Shared column selection + row mapping for public blog listings, used by the
 * /blogs and /blog-categories/[slug] endpoints so the response shape stays
 * identical across both.
 */

import type { PublicBlogPost } from '@/types/admin';

export const PUBLIC_LIST_COLUMNS = `
  id, title, slug, excerpt, featured_image_url, featured_image_alt,
  author, category_id, published_at, reading_time_minutes, word_count, is_featured, view_count,
  meta_title, meta_description, focus_keyword, canonical_url,
  og_title, og_description, og_image, twitter_title, twitter_description, twitter_image,
  answer_summary, primary_entity, key_takeaways, faqs, structured_data,
  blog_categories(name, slug, color),
  blog_post_tags(blog_tags(name, slug))
`;

export function mapPublicListRow(row: Record<string, unknown>): PublicBlogPost {
  const cat = row.blog_categories as { name: string; slug: string; color: string | null } | null;
  const tagRows = (row.blog_post_tags as Array<{ blog_tags: { name: string; slug: string } }>) ?? [];
  return {
    id: row.id as string,
    title: row.title as string,
    slug: row.slug as string,
    excerpt: row.excerpt as string,
    featuredImageUrl: (row.featured_image_url as string) ?? null,
    featuredImageAlt: (row.featured_image_alt as string) ?? null,
    author: row.author as string,
    categoryName: cat?.name ?? null,
    categorySlug: cat?.slug ?? null,
    categoryColor: cat?.color ?? null,
    isFeatured: (row.is_featured as boolean) ?? false,
    viewCount: (row.view_count as number) ?? 0,
    tags: tagRows.map(t => ({ name: t.blog_tags.name, slug: t.blog_tags.slug })),
    publishedAt: row.published_at as string,
    readingTimeMinutes: (row.reading_time_minutes as number) ?? 1,
    wordCount: (row.word_count as number) ?? 0,
    content: '',
    contentHtml: null,   // body omitted in listings — fetch the single post for full content
    contentJson: null,
    toc: [],
    relatedBlogs: [],
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
}
