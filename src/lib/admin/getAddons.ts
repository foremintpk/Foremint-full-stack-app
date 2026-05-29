import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { AddonFilters, Addon, AddonStatus, AddonCategory } from '@/types/admin';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

async function fetchAddons(
  supabase: SupabaseClient<Database>,
  filters: AddonFilters
): Promise<Addon[]> {
  const { categoryId, status, search } = filters;

  // Fetch addons with their categories via join
  let query = supabase
    .from('addons')
    .select(`
      id, name, price, features, status, created_at, updated_at,
      addon_category_map (
        category_id,
        addon_categories ( id, name, created_at )
      )
    `)
    .order('created_at', { ascending: false });

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }
  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  // If categoryId filter active, filter in JS after join
  let addons: Addon[] = (data ?? []).map((row: any) => {
    const rawCategories = row.addon_category_map ?? [];
    
    // Process categories explicitly checking structure to bypass TS Any issues
    const categories: AddonCategory[] = rawCategories
      .map((m: any) => m.addon_categories)
      .filter(Boolean)
      .map((c: any) => ({
        id: c.id,
        name: c.name,
        createdAt: c.created_at,
      }));

    return {
      id: row.id,
      name: row.name,
      price: Number(row.price),
      features: row.features,
      status: row.status as AddonStatus,
      categories,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });

  if (categoryId && categoryId !== 'all') {
    addons = addons.filter(a =>
      a.categories.some(c => c.id === categoryId)
    );
  }

  return addons;
}

async function getCachedAddons(filters: AddonFilters): Promise<Addon[]> {
  // createClient() (which calls cookies()) lives OUTSIDE unstable_cache — required by Next.js 15+
  const supabase = await createClient();
  const filterKey = JSON.stringify(filters);

  return unstable_cache(
    async () => {
      return fetchAddons(supabase, filters);
    },
    [`addon-list-${filterKey}`],
    { revalidate: 120, tags: ['addon-list'] }
  )();
}

export const getAddons = cache(getCachedAddons);
