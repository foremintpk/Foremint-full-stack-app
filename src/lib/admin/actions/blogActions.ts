'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidateTag, revalidatePath, updateTag } from 'next/cache';
import type { BlogStatus, BlogFaq } from '@/types/admin';
import {
  slugify,
  processBlogContent,
  sanitizeBlogHtml,
  generateExcerpt,
  generateMetaTitle,
  generateMetaDescription,
  stripHtml,
} from '@/lib/blog/content';
import { generateBlogHtmlFromJson } from '@/lib/blog/render';
import {
  resolvePublishTimestamps,
  validatePublishState,
  needsPublishRepair,
} from '@/lib/blog/publishState';

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

async function ensureUniqueSlug(
  adminSdk: ReturnType<typeof createAdminClient>,
  table: 'blog_posts' | 'blog_categories',
  slug: string,
  excludeId?: string,
): Promise<string> {
  let candidate = slug || 'post';
  let suffix = 0;
  while (true) {
    const query = (adminSdk as any).from(table).select('id').eq('slug', candidate);
    if (excludeId) query.neq('id', excludeId);
    const { data } = await query.maybeSingle();
    if (!data) return candidate;
    suffix++;
    candidate = `${slug}-${suffix}`;
  }
}

// ── Status transition validation ──────────────────────────────────────────────

const ALLOWED_TRANSITIONS: Record<BlogStatus, BlogStatus[]> = {
  draft:     ['draft', 'published', 'scheduled', 'archived'],
  scheduled: ['scheduled', 'draft', 'published', 'archived'],
  published: ['published', 'archived', 'draft'],
  archived:  ['archived', 'draft', 'published', 'scheduled'],
};

function validateTransition(from: BlogStatus, to: BlogStatus): string | null {
  if (from === to) return null;
  if (!ALLOWED_TRANSITIONS[from]?.includes(to)) {
    return `Cannot change status from "${from}" to "${to}".`;
  }
  return null;
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
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://foremint.pk';
  const orgName = 'ForeMint';
  const logoUrl = `${baseUrl}/logo.png`;

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: orgName,
    url: baseUrl,
    logo: { '@type': 'ImageObject', url: logoUrl },
  };

  const authorSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: params.author,
  };

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: params.title,
    description: params.excerpt,
    author: { '@type': 'Person', name: params.author },
    publisher: {
      '@type': 'Organization',
      name: orgName,
      logo: { '@type': 'ImageObject', url: logoUrl },
    },
    datePublished: params.publishedAt ?? params.updatedAt,
    dateModified: params.updatedAt,
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${baseUrl}/blog/${params.slug}` },
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
    organization: organizationSchema,
    author: authorSchema,
    ...(faqSchema ? { faq: faqSchema } : {}),
    breadcrumb,
  };
}

// ── Parse + derive form data ────────────────────────────────────────────────────

function parseBlogFormData(formData: FormData) {
  const get = (k: string) => (formData.get(k) as string | null)?.trim() ?? '';

  const title = get('title');
  const slugRaw = get('slug');
  const author = get('author');
  // Multi-category: the first selected id is the primary (kept in blog_posts.category_id).
  const categoryIds = formData.getAll('categoryIds').map(v => String(v)).filter(Boolean);
  const categoryId = categoryIds[0] ?? null;
  const status = (formData.get('status') as BlogStatus | null) ?? 'draft';
  // Absolute ISO instant. The client converts the tz-less `datetime-local`
  // value using the browser's IANA zone before submitting.
  const publishDate = get('publishDate') || null;
  // Set only by the explicit "Publish Now" correction action — never by a
  // normal save, which must preserve publication history.
  const republish = formData.get('republish') === 'true';

  const contentHtmlRaw = (formData.get('contentHtml') as string | null) ?? '';
  let contentJson: Record<string, unknown> | null = null;
  try { contentJson = JSON.parse((formData.get('contentJson') as string | null) ?? 'null'); } catch { contentJson = null; }

  const excerptRaw = get('excerpt');
  const featuredImageUrl = get('featuredImageUrl') || null;
  const featuredImageAlt = get('featuredImageAlt') || null;
  const isFeatured = formData.get('isFeatured') === 'true';

  const metaTitleRaw = get('metaTitle') || null;
  const metaDescriptionRaw = get('metaDescription') || null;
  const focusKeyword = get('focusKeyword') || null;
  const canonicalUrl = get('canonicalUrl') || null;

  const answerSummary = get('answerSummary') || null;
  let faqs: BlogFaq[] = [];
  try { faqs = JSON.parse((formData.get('faqs') as string | null) ?? '[]') as BlogFaq[]; } catch { faqs = []; }
  faqs = faqs.filter(f => f.question?.trim() && f.answer?.trim());

  const tagIds = formData.getAll('tagIds').map(v => String(v)).filter(Boolean);

  // ── Auto-derived values ──
  // Semantic HTML is generated server-side from the structured JSON (deterministic,
  // styling-free). Fall back to the sanitized client HTML only for empty/legacy JSON.
  const generated = generateBlogHtmlFromJson(contentJson);
  const { html: contentHtml, toc } = generated.html
    ? generated
    : processBlogContent(sanitizeBlogHtml(contentHtmlRaw));
  const plainText = stripHtml(contentHtml);
  const excerpt = excerptRaw || generateExcerpt(contentHtml);
  const metaTitle = metaTitleRaw || generateMetaTitle(title);
  const metaDescription = metaDescriptionRaw || (excerpt ? generateMetaDescription(contentHtml) || excerpt : null);

  return {
    title, slugRaw, author, categoryId, categoryIds, status, publishDate, republish,
    contentHtml, contentJson, toc, plainText,
    excerpt, featuredImageUrl, featuredImageAlt, isFeatured,
    metaTitle, metaDescription, focusKeyword, canonicalUrl,
    answerSummary, faqs, tagIds,
  };
}

type ParsedBlog = ReturnType<typeof parseBlogFormData>;

function validateBlog(parsed: ParsedBlog): string | null {
  if (!parsed.title) return 'Title is required';
  if (!parsed.plainText.trim()) return 'Content is required';
  return validatePublishState({
    status: parsed.status,
    publishDate: parsed.publishDate,
    now: new Date(),
  });
}

/** Replace a post's category set in the many-to-many junction table. */
async function syncPostCategories(
  adminSdk: ReturnType<typeof createAdminClient>,
  postId: string,
  categoryIds: string[],
): Promise<void> {
  await (adminSdk as any).from('blog_post_categories').delete().eq('post_id', postId);
  if (categoryIds.length > 0) {
    await (adminSdk as any)
      .from('blog_post_categories')
      .insert(categoryIds.map((category_id) => ({ post_id: postId, category_id })));
  }
}

async function resolveCategoryName(
  adminSdk: ReturnType<typeof createAdminClient>,
  categoryId: string | null,
): Promise<{ name: string | null; error?: string }> {
  if (!categoryId) return { name: null };
  const { data } = await (adminSdk as any)
    .from('blog_categories').select('name, deleted_at').eq('id', categoryId).maybeSingle();
  if (!data || data.deleted_at) return { name: null, error: 'Selected category does not exist' };
  return { name: data.name };
}

// Build the OG/Twitter + meta payload that is auto-generated from core fields.
function buildAutoMeta(parsed: ParsedBlog) {
  return {
    meta_title: parsed.metaTitle,
    meta_description: parsed.metaDescription,
    og_title: parsed.metaTitle,
    og_description: parsed.metaDescription,
    og_image: parsed.featuredImageUrl,
    twitter_title: parsed.metaTitle,
    twitter_description: parsed.metaDescription,
    twitter_image: parsed.featuredImageUrl,
  };
}

// ── Create blog post ──────────────────────────────────────────────────────────

export async function createBlogPost(formData: FormData): Promise<{ error?: string; id?: string }> {
  try {
    const { userId } = await verifyBlogRole();
    const adminSdk = createAdminClient();
    const parsed = parseBlogFormData(formData);

    const validationError = validateBlog(parsed);
    if (validationError) return { error: validationError };

    const { name: categoryName, error: catError } = await resolveCategoryName(adminSdk, parsed.categoryId);
    if (catError) return { error: catError };

    // Always slugify — never trust a raw slug field (could contain spaces / "?").
    const baseSlug = slugify(parsed.slugRaw || parsed.title);
    const slug = await ensureUniqueSlug(adminSdk, 'blog_posts', baseSlug);

    const nowDate = new Date();
    const now = nowDate.toISOString();
    // Server clock is authoritative for the actual publication timestamp.
    const resolved = resolvePublishTimestamps({
      status: parsed.status,
      publishDate: parsed.publishDate,
      existingPublishedAt: null,
      now: nowDate,
    });
    const publishedAt = resolved.publishedAt;

    const structuredData = buildStructuredData({
      title: parsed.title, slug, excerpt: parsed.excerpt, author: parsed.author,
      publishedAt, updatedAt: now, featuredImageUrl: parsed.featuredImageUrl,
      faqs: parsed.faqs, focusKeyword: parsed.focusKeyword, categoryName,
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
        is_featured: parsed.isFeatured,
        publish_date: resolved.publishDate,
        content: parsed.plainText,
        content_html: parsed.contentHtml,
        content_json: parsed.contentJson,
        toc: parsed.toc,
        focus_keyword: parsed.focusKeyword,
        canonical_url: parsed.canonicalUrl,
        ...buildAutoMeta(parsed),
        answer_summary: parsed.answerSummary,
        faqs: parsed.faqs,
        structured_data: structuredData,
        created_by: userId,
        updated_by: userId,
        published_at: publishedAt,
        published_by: publishedAt ? userId : null,
      })
      .select('id')
      .single();

    if (error) return { error: error.message };

    if (parsed.tagIds.length > 0) {
      await (adminSdk as any)
        .from('blog_post_tags')
        .insert(parsed.tagIds.map(tag_id => ({ post_id: post.id, tag_id })));
    }

    await syncPostCategories(adminSdk, post.id, parsed.categoryIds);

    revalidateTag('blog-list', 'max');
    revalidateTag('blog-categories', 'max');
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

    const validationError = validateBlog(parsed);
    if (validationError) return { error: validationError };

    const { data: existing } = await (adminSdk as any)
      .from('blog_posts').select('slug, published_at, published_by, status').eq('id', id).single();
    if (!existing) return { error: 'Blog post not found' };

    const transitionError = validateTransition(existing.status as BlogStatus, parsed.status);
    if (transitionError) return { error: transitionError };

    const { name: categoryName, error: catError } = await resolveCategoryName(adminSdk, parsed.categoryId);
    if (catError) return { error: catError };

    // Always slugify — never trust a raw slug field (could contain spaces / "?").
    const baseSlug = slugify(parsed.slugRaw || parsed.title);
    const slug = baseSlug !== existing.slug
      ? await ensureUniqueSlug(adminSdk, 'blog_posts', baseSlug, id)
      : existing.slug;

    const nowDate = new Date();
    const now = nowDate.toISOString();
    // Repairing an invalid published-but-future row counts as an explicit
    // republish even if the client did not flag it, so the fix is reachable.
    const republish = parsed.republish || (
      parsed.status === 'published' &&
      needsPublishRepair(
        { status: existing.status as BlogStatus, publishedAt: existing.published_at as string | null },
        nowDate,
      )
    );
    // Normal edits (title/content/SEO/tags/…) must never move published_at.
    const resolved = resolvePublishTimestamps({
      status: parsed.status,
      publishDate: parsed.publishDate,
      existingPublishedAt: (existing.published_at as string | null) ?? null,
      republish,
      now: nowDate,
    });
    const publishedAt = resolved.publishedAt;
    const publishedBy = resolved.isPublishing ? userId : (existing.published_by ?? null);

    const structuredData = buildStructuredData({
      title: parsed.title, slug, excerpt: parsed.excerpt, author: parsed.author,
      publishedAt, updatedAt: now, featuredImageUrl: parsed.featuredImageUrl,
      faqs: parsed.faqs, focusKeyword: parsed.focusKeyword, categoryName,
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
        is_featured: parsed.isFeatured,
        publish_date: resolved.publishDate,
        content: parsed.plainText,
        content_html: parsed.contentHtml,
        content_json: parsed.contentJson,
        toc: parsed.toc,
        focus_keyword: parsed.focusKeyword,
        canonical_url: parsed.canonicalUrl,
        ...buildAutoMeta(parsed),
        answer_summary: parsed.answerSummary,
        faqs: parsed.faqs,
        structured_data: structuredData,
        updated_by: userId,
        published_at: publishedAt,
        published_by: publishedBy,
        updated_at: now,
      })
      .eq('id', id);

    if (error) return { error: error.message };

    await (adminSdk as any).from('blog_post_tags').delete().eq('post_id', id);
    if (parsed.tagIds.length > 0) {
      await (adminSdk as any)
        .from('blog_post_tags')
        .insert(parsed.tagIds.map(tag_id => ({ post_id: id, tag_id })));
    }

    await syncPostCategories(adminSdk, id, parsed.categoryIds);

    revalidateTag('blog-list', 'max');
    revalidateTag('blog-categories', 'max');
    revalidateTag(`blog-post-${id}`, 'max');
    revalidatePath('/admin/blogs', 'layout');
    return {};
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred' };
  }
}

// ── Publish now (explicit publication-date correction) ────────────────────────

/**
 * Publish a post immediately, stamping published_at with the server clock.
 *
 * This is the *only* path that rewrites an existing published_at, and it exists
 * so an accidentally future-dated post (status=published, published_at > now —
 * which the public API correctly hides) can be repaired from the dashboard.
 * Touches publishing columns only: title, slug, content, SEO, category, tags,
 * featured image, author and structured data are all left untouched.
 */
export async function publishBlogPostNow(id: string): Promise<{ error?: string }> {
  try {
    const { userId } = await verifyBlogRole();
    const adminSdk = createAdminClient();

    const { data: existing } = await (adminSdk as any)
      .from('blog_posts').select('id, status, published_by').eq('id', id).single();
    if (!existing) return { error: 'Blog post not found' };

    const now = new Date().toISOString();

    const { error } = await (adminSdk as any)
      .from('blog_posts')
      .update({
        status: 'published',
        published_at: now,
        // An immediate publication has no outstanding scheduling request.
        publish_date: null,
        published_by: (existing.published_by as string | null) ?? userId,
        updated_by: userId,
        updated_at: now,
      })
      .eq('id', id);

    if (error) return { error: error.message };

    // Read-your-own-writes: the admin must see the post live immediately after
    // repairing it, so expire the cache rather than serving stale content.
    updateTag('blog-list');
    updateTag(`blog-post-${id}`);
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

// ── Category CRUD ───────────────────────────────────────────────────────────────

function parseCategoryFormData(formData: FormData) {
  const get = (k: string) => (formData.get(k) as string | null)?.trim() ?? '';
  return {
    name: get('name'),
    slugRaw: get('slug'),
    description: get('description') || null,
    color: get('color') || null,
    sortOrder: parseInt(get('sortOrder') || '0', 10) || 0,
    isActive: formData.get('isActive') !== 'false',
  };
}

export async function createBlogCategory(formData: FormData): Promise<{ error?: string; id?: string }> {
  try {
    await verifyBlogRole();
    const adminSdk = createAdminClient();
    const parsed = parseCategoryFormData(formData);
    if (!parsed.name) return { error: 'Name is required' };

    const baseSlug = slugify(parsed.slugRaw || parsed.name);
    const slug = await ensureUniqueSlug(adminSdk, 'blog_categories', baseSlug);

    const { data, error } = await (adminSdk as any)
      .from('blog_categories')
      .insert({
        name: parsed.name,
        slug,
        description: parsed.description,
        color: parsed.color,
        sort_order: parsed.sortOrder,
        is_active: parsed.isActive,
      })
      .select('id')
      .single();
    if (error) return { error: error.message };

    revalidateTag('blog-categories', 'max');
    revalidatePath('/admin/blog-categories', 'layout');
    return { id: data.id };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred' };
  }
}

export async function updateBlogCategory(id: string, formData: FormData): Promise<{ error?: string }> {
  try {
    await verifyBlogRole();
    const adminSdk = createAdminClient();
    const parsed = parseCategoryFormData(formData);
    if (!parsed.name) return { error: 'Name is required' };

    const { data: existing } = await (adminSdk as any)
      .from('blog_categories').select('slug').eq('id', id).single();
    if (!existing) return { error: 'Category not found' };

    const baseSlug = slugify(parsed.slugRaw || parsed.name);
    const slug = baseSlug !== existing.slug
      ? await ensureUniqueSlug(adminSdk, 'blog_categories', baseSlug, id)
      : existing.slug;

    const { error } = await (adminSdk as any)
      .from('blog_categories')
      .update({
        name: parsed.name,
        slug,
        description: parsed.description,
        color: parsed.color,
        sort_order: parsed.sortOrder,
        is_active: parsed.isActive,
      })
      .eq('id', id);
    if (error) return { error: error.message };

    revalidateTag('blog-categories', 'max');
    revalidatePath('/admin/blog-categories', 'layout');
    return {};
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred' };
  }
}

/** Soft-delete a category (keeps the row, detaches it from public listings). */
export async function deleteBlogCategory(id: string): Promise<{ error?: string }> {
  try {
    await verifyBlogRole();
    const adminSdk = createAdminClient();
    const { error } = await (adminSdk as any)
      .from('blog_categories')
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq('id', id);
    if (error) return { error: error.message };
    revalidateTag('blog-categories', 'max');
    revalidatePath('/admin/blog-categories', 'layout');
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
    const slug = slugify(name.trim());
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
