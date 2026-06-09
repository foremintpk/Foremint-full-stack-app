'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidateTag, revalidatePath } from 'next/cache';
import type { BlogStatus, BlogContentType, BlogFaq } from '@/types/admin';

// ── Auth helper ───────────────────────────────────────────────────────────────

async function verifyBlogRole() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims ? { id: claimsData.claims.sub } : null;
  if (!user) throw new Error('Unauthorized');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (profile?.is_active !== true || (profile?.role !== 'administrator' && profile?.role !== 'manager')) {
    throw new Error('Unauthorized');
  }

  return { userId: user.id, role: profile.role };
}

// ── Slug helpers ──────────────────────────────────────────────────────────────

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);
}

async function ensureUniqueSlug(adminSdk: ReturnType<typeof createAdminClient>, slug: string, excludeId?: string): Promise<string> {
  let candidate = slug;
  let suffix = 0;
  while (true) {
    const query = (adminSdk as any)
      .from('blog_posts')
      .select('id')
      .eq('slug', candidate);
    if (excludeId) query.neq('id', excludeId);
    const { data } = await query.maybeSingle();
    if (!data) return candidate;
    suffix++;
    candidate = `${slug}-${suffix}`;
  }
}

// ── JSON-LD builder ───────────────────────────────────────────────────────────

function buildStructuredData(params: {
  title: string;
  slug: string;
  excerpt: string;
  author: string;
  publishedAt?: string | null;
  updatedAt: string;
  featuredImageUrl?: string | null;
  faqs: BlogFaq[];
  focusKeyword?: string | null;
  categoryName?: string | null;
}): Record<string, unknown> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.foremint.com';
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: params.title,
    description: params.excerpt,
    author: { '@type': 'Person', name: params.author },
    datePublished: params.publishedAt ?? params.updatedAt,
    dateModified: params.updatedAt,
    url: `${baseUrl}/blog/${params.slug}`,
    ...(params.featuredImageUrl ? { image: params.featuredImageUrl } : {}),
    ...(params.categoryName ? { articleSection: params.categoryName } : {}),
    ...(params.focusKeyword ? { keywords: params.focusKeyword } : {}),
  };

  const faqSchema = params.faqs.length > 0
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: params.faqs.map(f => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: { '@type': 'Answer', text: f.answer },
        })),
      }
    : null;

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${baseUrl}/blog` },
      { '@type': 'ListItem', position: 3, name: params.title, item: `${baseUrl}/blog/${params.slug}` },
    ],
  };

  return {
    article: articleSchema,
    ...(faqSchema ? { faq: faqSchema } : {}),
    breadcrumb,
  };
}

// ── Parse form data ───────────────────────────────────────────────────────────

function parseBlogFormData(formData: FormData) {
  const title = (formData.get('title') as string | null)?.trim() ?? '';
  const slugRaw = (formData.get('slug') as string | null)?.trim() ?? '';
  const excerpt = (formData.get('excerpt') as string | null)?.trim() ?? '';
  const featuredImageUrl = (formData.get('featuredImageUrl') as string | null)?.trim() || null;
  const featuredImageAlt = (formData.get('featuredImageAlt') as string | null)?.trim() || null;
  const author = (formData.get('author') as string | null)?.trim() ?? '';
  const categoryId = (formData.get('categoryId') as string | null)?.trim() || null;
  const status = (formData.get('status') as BlogStatus | null) ?? 'draft';
  const publishDate = (formData.get('publishDate') as string | null)?.trim() || null;
  const content = (formData.get('content') as string | null) ?? '';

  // SEO
  const metaTitle = (formData.get('metaTitle') as string | null)?.trim() || null;
  const metaDescription = (formData.get('metaDescription') as string | null)?.trim() || null;
  const focusKeyword = (formData.get('focusKeyword') as string | null)?.trim() || null;
  const secondaryKeywordsRaw = (formData.get('secondaryKeywords') as string | null) ?? '';
  const secondaryKeywords = secondaryKeywordsRaw.split(',').map(s => s.trim()).filter(Boolean);
  const canonicalUrl = (formData.get('canonicalUrl') as string | null)?.trim() || null;
  const ogTitle = (formData.get('ogTitle') as string | null)?.trim() || null;
  const ogDescription = (formData.get('ogDescription') as string | null)?.trim() || null;
  const ogImage = (formData.get('ogImage') as string | null)?.trim() || null;
  const twitterTitle = (formData.get('twitterTitle') as string | null)?.trim() || null;
  const twitterDescription = (formData.get('twitterDescription') as string | null)?.trim() || null;
  const twitterImage = (formData.get('twitterImage') as string | null)?.trim() || null;

  // AEO
  const answerSummary = (formData.get('answerSummary') as string | null)?.trim() || null;
  const primaryEntity = (formData.get('primaryEntity') as string | null)?.trim() || null;
  const relatedEntitiesRaw = (formData.get('relatedEntities') as string | null) ?? '';
  const relatedEntities = relatedEntitiesRaw.split(',').map(s => s.trim()).filter(Boolean);
  const contentType = (formData.get('contentType') as BlogContentType | null) || null;
  const keyTakeawaysRaw = (formData.get('keyTakeaways') as string | null) ?? '';
  const keyTakeaways = keyTakeawaysRaw.split('\n').map(s => s.trim()).filter(Boolean);
  const faqsJson = (formData.get('faqs') as string | null) ?? '[]';
  let faqs: BlogFaq[] = [];
  try { faqs = JSON.parse(faqsJson) as BlogFaq[]; } catch { faqs = []; }

  const tagIds = formData.getAll('tagIds').map(v => String(v)).filter(Boolean);

  return {
    title, slugRaw, excerpt, featuredImageUrl, featuredImageAlt, author, categoryId,
    status, publishDate, content, metaTitle, metaDescription, focusKeyword,
    secondaryKeywords, canonicalUrl, ogTitle, ogDescription, ogImage,
    twitterTitle, twitterDescription, twitterImage, answerSummary, primaryEntity,
    relatedEntities, contentType, keyTakeaways, faqs, tagIds,
  };
}

// ── Create blog post ──────────────────────────────────────────────────────────

export async function createBlogPost(formData: FormData): Promise<{ error?: string; id?: string }> {
  try {
    const { userId } = await verifyBlogRole();
    const adminSdk = createAdminClient();
    const parsed = parseBlogFormData(formData);

    if (!parsed.title) return { error: 'Title is required' };
    if (!parsed.excerpt) return { error: 'Excerpt is required' };
    if (!parsed.author) return { error: 'Author is required' };

    const baseSlug = parsed.slugRaw || generateSlug(parsed.title);
    const slug = await ensureUniqueSlug(adminSdk, baseSlug);

    const now = new Date().toISOString();
    const publishedAt = parsed.status === 'published' ? (parsed.publishDate ?? now) : null;

    // Fetch category name for structured data
    let categoryName: string | null = null;
    if (parsed.categoryId) {
      const { data: cat } = await (adminSdk as any)
        .from('blog_categories').select('name').eq('id', parsed.categoryId).single();
      categoryName = cat?.name ?? null;
    }

    const structuredData = buildStructuredData({
      title: parsed.title,
      slug,
      excerpt: parsed.excerpt,
      author: parsed.author,
      publishedAt,
      updatedAt: now,
      featuredImageUrl: parsed.featuredImageUrl,
      faqs: parsed.faqs,
      focusKeyword: parsed.focusKeyword,
      categoryName,
    });

    const { data: post, error } = await (adminSdk as any)
      .from('blog_posts')
      .insert({
        title: parsed.title,
        slug,
        excerpt: parsed.excerpt,
        featured_image_url: parsed.featuredImageUrl,
        featured_image_alt: parsed.featuredImageAlt,
        author: parsed.author,
        category_id: parsed.categoryId,
        status: parsed.status,
        publish_date: parsed.publishDate || null,
        content: parsed.content,
        meta_title: parsed.metaTitle,
        meta_description: parsed.metaDescription,
        focus_keyword: parsed.focusKeyword,
        secondary_keywords: parsed.secondaryKeywords,
        canonical_url: parsed.canonicalUrl,
        og_title: parsed.ogTitle,
        og_description: parsed.ogDescription,
        og_image: parsed.ogImage,
        twitter_title: parsed.twitterTitle,
        twitter_description: parsed.twitterDescription,
        twitter_image: parsed.twitterImage,
        answer_summary: parsed.answerSummary,
        primary_entity: parsed.primaryEntity,
        related_entities: parsed.relatedEntities,
        content_type: parsed.contentType,
        key_takeaways: parsed.keyTakeaways,
        faqs: parsed.faqs,
        structured_data: structuredData,
        created_by: userId,
        updated_by: userId,
        published_at: publishedAt,
      })
      .select('id')
      .single();

    if (error) return { error: error.message };

    // Sync tags
    if (parsed.tagIds.length > 0) {
      await (adminSdk as any)
        .from('blog_post_tags')
        .insert(parsed.tagIds.map(tag_id => ({ post_id: post.id, tag_id })));
    }

    revalidateTag('blog-list', 'max');
    revalidatePath('/admin/blogs', 'layout');

    return { id: post.id };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred' };
  }
}

// ── Update blog post ──────────────────────────────────────────────────────────

export async function updateBlogPost(id: string, formData: FormData): Promise<{ error?: string }> {
  try {
    const { userId } = await verifyBlogRole();
    const adminSdk = createAdminClient();
    const parsed = parseBlogFormData(formData);

    if (!parsed.title) return { error: 'Title is required' };
    if (!parsed.excerpt) return { error: 'Excerpt is required' };
    if (!parsed.author) return { error: 'Author is required' };

    // Resolve slug — keep existing if not changed
    const { data: existing } = await (adminSdk as any)
      .from('blog_posts').select('slug, published_at, status').eq('id', id).single();
    if (!existing) return { error: 'Blog post not found' };

    const baseSlug = parsed.slugRaw || generateSlug(parsed.title);
    const slug = baseSlug !== existing.slug
      ? await ensureUniqueSlug(adminSdk, baseSlug, id)
      : existing.slug;

    const now = new Date().toISOString();
    const wasPublished = existing.status === 'published';
    const isPublishing = parsed.status === 'published' && !wasPublished;
    const publishedAt = isPublishing
      ? (parsed.publishDate ?? now)
      : (existing.published_at ?? (wasPublished ? existing.published_at : null));

    let categoryName: string | null = null;
    if (parsed.categoryId) {
      const { data: cat } = await (adminSdk as any)
        .from('blog_categories').select('name').eq('id', parsed.categoryId).single();
      categoryName = cat?.name ?? null;
    }

    const structuredData = buildStructuredData({
      title: parsed.title,
      slug,
      excerpt: parsed.excerpt,
      author: parsed.author,
      publishedAt,
      updatedAt: now,
      featuredImageUrl: parsed.featuredImageUrl,
      faqs: parsed.faqs,
      focusKeyword: parsed.focusKeyword,
      categoryName,
    });

    const { error } = await (adminSdk as any)
      .from('blog_posts')
      .update({
        title: parsed.title,
        slug,
        excerpt: parsed.excerpt,
        featured_image_url: parsed.featuredImageUrl,
        featured_image_alt: parsed.featuredImageAlt,
        author: parsed.author,
        category_id: parsed.categoryId,
        status: parsed.status,
        publish_date: parsed.publishDate || null,
        content: parsed.content,
        meta_title: parsed.metaTitle,
        meta_description: parsed.metaDescription,
        focus_keyword: parsed.focusKeyword,
        secondary_keywords: parsed.secondaryKeywords,
        canonical_url: parsed.canonicalUrl,
        og_title: parsed.ogTitle,
        og_description: parsed.ogDescription,
        og_image: parsed.ogImage,
        twitter_title: parsed.twitterTitle,
        twitter_description: parsed.twitterDescription,
        twitter_image: parsed.twitterImage,
        answer_summary: parsed.answerSummary,
        primary_entity: parsed.primaryEntity,
        related_entities: parsed.relatedEntities,
        content_type: parsed.contentType,
        key_takeaways: parsed.keyTakeaways,
        faqs: parsed.faqs,
        structured_data: structuredData,
        updated_by: userId,
        published_at: publishedAt,
        updated_at: now,
      })
      .eq('id', id);

    if (error) return { error: error.message };

    // Sync tags — delete all then re-insert
    await (adminSdk as any).from('blog_post_tags').delete().eq('post_id', id);
    if (parsed.tagIds.length > 0) {
      await (adminSdk as any)
        .from('blog_post_tags')
        .insert(parsed.tagIds.map(tag_id => ({ post_id: id, tag_id })));
    }

    revalidateTag('blog-list', 'max');
    revalidateTag(`blog-post-${id}`, 'max');
    revalidatePath('/admin/blogs', 'layout');

    return {};
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred' };
  }
}

// ── Delete blog post ──────────────────────────────────────────────────────────

export async function deleteBlogPost(id: string): Promise<{ error?: string }> {
  try {
    await verifyBlogRole();
    const adminSdk = createAdminClient();

    const { error } = await (adminSdk as any).from('blog_posts').delete().eq('id', id);
    if (error) return { error: error.message };

    revalidateTag('blog-list', 'max');
    revalidateTag(`blog-post-${id}`, 'max');
    revalidatePath('/admin/blogs', 'layout');

    return {};
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred' };
  }
}

// ── Category actions ──────────────────────────────────────────────────────────

export async function createBlogCategory(formData: FormData): Promise<{ error?: string }> {
  try {
    await verifyBlogRole();
    const adminSdk = createAdminClient();
    const name = (formData.get('name') as string | null)?.trim() ?? '';
    const description = (formData.get('description') as string | null)?.trim() || null;
    if (!name) return { error: 'Name is required' };
    const slug = generateSlug(name);

    const { error } = await (adminSdk as any)
      .from('blog_categories')
      .insert({ name, slug, description });
    if (error) return { error: error.message };

    revalidateTag('blog-categories', 'max');
    return {};
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred' };
  }
}

export async function deleteBlogCategory(id: string): Promise<{ error?: string }> {
  try {
    await verifyBlogRole();
    const adminSdk = createAdminClient();
    const { error } = await (adminSdk as any).from('blog_categories').delete().eq('id', id);
    if (error) return { error: error.message };
    revalidateTag('blog-categories', 'max');
    return {};
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred' };
  }
}

// ── Tag actions ───────────────────────────────────────────────────────────────

export async function createBlogTag(name: string): Promise<{ error?: string; id?: string }> {
  try {
    await verifyBlogRole();
    const adminSdk = createAdminClient();
    if (!name.trim()) return { error: 'Tag name is required' };
    const slug = generateSlug(name.trim());
    const { data, error } = await (adminSdk as any)
      .from('blog_tags')
      .insert({ name: name.trim(), slug })
      .select('id')
      .single();
    if (error) return { error: error.message };
    revalidateTag('blog-tags', 'max');
    return { id: data.id };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred' };
  }
}
