import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import type { BlogPost, BlogListFilters, BlogListResult, BlogCategory, BlogTag } from '@/types/admin';

function mapRowToPost(row: Record<string, unknown>, tags: BlogTag[] = [], categoryIds: string[] = []): BlogPost {
  return {
    id: row.id as string,
    title: row.title as string,
    slug: row.slug as string,
    excerpt: row.excerpt as string,
    featuredImageUrl: (row.featured_image_url as string) ?? null,
    featuredImageAlt: (row.featured_image_alt as string) ?? null,
    author: row.author as string,
    categoryId: (row.category_id as string) ?? null,
    categoryName: (row as Record<string, unknown> & { blog_categories?: { name: string } | null }).blog_categories?.name ?? null,
    categoryIds: categoryIds.length > 0 ? categoryIds : ((row.category_id as string) ? [row.category_id as string] : []),
    tags,
    status: row.status as BlogPost['status'],
    isFeatured: (row.is_featured as boolean) ?? false,
    publishDate: (row.publish_date as string) ?? null,
    publishedAt: (row.published_at as string) ?? null,
    publishedBy: (row.published_by as string) ?? null,
    content: (row.content as string) ?? '',
    contentJson: (row.content_json as Record<string, unknown>) ?? null,
    contentHtml: (row.content_html as string) ?? null,
    toc: (row.toc as BlogPost['toc']) ?? [],
    metaTitle: (row.meta_title as string) ?? null,
    metaDescription: (row.meta_description as string) ?? null,
    focusKeyword: (row.focus_keyword as string) ?? null,
    secondaryKeywords: (row.secondary_keywords as string[]) ?? [],
    canonicalUrl: (row.canonical_url as string) ?? null,
    ogTitle: (row.og_title as string) ?? null,
    ogDescription: (row.og_description as string) ?? null,
    ogImage: (row.og_image as string) ?? null,
    twitterTitle: (row.twitter_title as string) ?? null,
    twitterDescription: (row.twitter_description as string) ?? null,
    twitterImage: (row.twitter_image as string) ?? null,
    answerSummary: (row.answer_summary as string) ?? null,
    primaryEntity: (row.primary_entity as string) ?? null,
    relatedEntities: (row.related_entities as string[]) ?? [],
    contentType: (row.content_type as BlogPost['contentType']) ?? null,
    keyTakeaways: (row.key_takeaways as string[]) ?? [],
    faqs: (row.faqs as BlogPost['faqs']) ?? [],
    relatedArticleIds: (row.related_article_ids as string[]) ?? [],
    relatedServicePages: (row.related_service_pages as string[]) ?? [],
    readingTimeMinutes: (row.reading_time_minutes as number) ?? 1,
    wordCount: (row.word_count as number) ?? 0,
    structuredData: (row.structured_data as Record<string, unknown>) ?? null,
    createdBy: (row.created_by as string) ?? null,
    updatedBy: (row.updated_by as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

async function fetchBlogPosts(filters: BlogListFilters): Promise<BlogListResult> {
  const adminSdk = createAdminClient();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 25;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = adminSdk
    .from('blog_posts')
    .select('*, blog_categories!category_id(name, slug)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters.categoryId && filters.categoryId !== 'all') {
    query = query.eq('category_id', filters.categoryId);
  }
  if (filters.q && filters.q.trim()) {
    query = query.ilike('title', `%${filters.q.trim()}%`);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const posts = (data || []).map((row: Record<string, unknown>) => mapRowToPost(row));
  const total = count ?? 0;

  return { posts, total, totalPages: Math.ceil(total / pageSize) };
}

export const getCachedBlogPosts = cache(async (filters: BlogListFilters): Promise<BlogListResult> => {
  return unstable_cache(
    async () => fetchBlogPosts(filters),
    [`blog-list-${JSON.stringify(filters)}`],
    { revalidate: 60, tags: ['blog-list'] }
  )();
});

async function fetchBlogPostById(id: string): Promise<BlogPost | null> {
  const adminSdk = createAdminClient();
  const { data, error } = await adminSdk
    .from('blog_posts')
    .select('*, blog_categories!category_id(name, slug)')
    .eq('id', id)
    .single();
  if (error || !data) return null;

  // Fetch tags
  const { data: tagRows } = await adminSdk
    .from('blog_post_tags')
    .select('blog_tags(id, name, slug, created_at)')
    .eq('post_id', id);

  const tags: BlogTag[] = (tagRows || [])
    .map((r: Record<string, unknown>) => (r as { blog_tags: BlogTag }).blog_tags)
    .filter(Boolean);

  // Fetch the post's categories (many-to-many junction)
  const { data: catRows } = await adminSdk
    .from('blog_post_categories')
    .select('category_id')
    .eq('post_id', id);
  const categoryIds: string[] = (catRows || [])
    .map((r: Record<string, unknown>) => r.category_id as string)
    .filter(Boolean);

  return mapRowToPost(data, tags, categoryIds);
}

export const getCachedBlogPost = cache(async (id: string): Promise<BlogPost | null> => {
  return unstable_cache(
    async () => fetchBlogPostById(id),
    [`blog-post-${id}`],
    { revalidate: 60, tags: [`blog-post-${id}`, 'blog-list'] }
  )();
});

function mapRowToCategory(r: Record<string, unknown>, postCount?: number): BlogCategory {
  return {
    id: r.id as string,
    name: r.name as string,
    slug: r.slug as string,
    description: (r.description as string) ?? null,
    color: (r.color as string) ?? null,
    sortOrder: (r.sort_order as number) ?? 0,
    isActive: (r.is_active as boolean) ?? true,
    deletedAt: (r.deleted_at as string) ?? null,
    ...(postCount !== undefined ? { postCount } : {}),
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

async function fetchBlogCategories(): Promise<BlogCategory[]> {
  const adminSdk = createAdminClient();
  const { data, error } = await adminSdk
    .from('blog_categories')
    .select('*')
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []).map((r: Record<string, unknown>) => mapRowToCategory(r));
}

export const getCachedBlogCategories = cache(async (): Promise<BlogCategory[]> => {
  return unstable_cache(
    async () => fetchBlogCategories(),
    ['blog-categories'],
    { revalidate: 300, tags: ['blog-categories'] }
  )();
});

/** Categories with their published-post counts — for the admin management page. */
async function fetchBlogCategoriesWithCounts(): Promise<BlogCategory[]> {
  const adminSdk = createAdminClient();
  const [{ data: cats, error }, { data: junction }] = await Promise.all([
    adminSdk.from('blog_categories').select('*').is('deleted_at', null)
      .order('sort_order', { ascending: true }).order('name', { ascending: true }),
    adminSdk.from('blog_post_categories').select('category_id'),
  ]);
  if (error) throw new Error(error.message);

  const counts = new Map<string, number>();
  for (const r of (junction || []) as Array<{ category_id: string | null }>) {
    if (r.category_id) counts.set(r.category_id, (counts.get(r.category_id) ?? 0) + 1);
  }
  return (cats || []).map((r: Record<string, unknown>) =>
    mapRowToCategory(r, counts.get(r.id as string) ?? 0));
}

export const getCachedBlogCategoriesWithCounts = cache(async (): Promise<BlogCategory[]> => {
  return unstable_cache(
    async () => fetchBlogCategoriesWithCounts(),
    ['blog-categories-counts'],
    { revalidate: 300, tags: ['blog-categories'] }
  )();
});

async function fetchBlogTags(): Promise<BlogTag[]> {
  const adminSdk = createAdminClient();
  const { data, error } = await adminSdk
    .from('blog_tags')
    .select('*')
    .order('name');
  if (error) throw new Error(error.message);
  return (data || []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    name: r.name as string,
    slug: r.slug as string,
    createdAt: r.created_at as string,
  }));
}

export const getCachedBlogTags = cache(async (): Promise<BlogTag[]> => {
  return unstable_cache(
    async () => fetchBlogTags(),
    ['blog-tags'],
    { revalidate: 300, tags: ['blog-tags'] }
  )();
});
