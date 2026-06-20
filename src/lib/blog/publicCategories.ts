/**
 * Shared query for public-facing blog categories — active, non-deleted, ordered
 * by sort order, each with a count of its published posts.
 */

import { createAdminClient } from '@/lib/supabase/admin';

export interface PublicBlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  sortOrder: number;
  postCount: number;
}

export async function getPublicCategories(): Promise<PublicBlogCategory[]> {
  const adminSdk = createAdminClient();
  const now = new Date().toISOString();

  const [{ data: cats }, { data: posts }] = await Promise.all([
    (adminSdk as any)
      .from('blog_categories')
      .select('id, name, slug, description, color, sort_order')
      .is('deleted_at', null)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
    (adminSdk as any)
      .from('blog_posts')
      .select('category_id')
      .eq('status', 'published')
      .lte('published_at', now),
  ]);

  const counts = new Map<string, number>();
  for (const p of (posts ?? []) as Array<{ category_id: string | null }>) {
    if (p.category_id) counts.set(p.category_id, (counts.get(p.category_id) ?? 0) + 1);
  }

  return ((cats ?? []) as Array<Record<string, unknown>>).map((c) => ({
    id: c.id as string,
    name: c.name as string,
    slug: c.slug as string,
    description: (c.description as string) ?? null,
    color: (c.color as string) ?? null,
    sortOrder: (c.sort_order as number) ?? 0,
    postCount: counts.get(c.id as string) ?? 0,
  }));
}
