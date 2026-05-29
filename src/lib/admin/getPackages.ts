/**
 * @file src/lib/admin/getPackages.ts
 * @description Fetches packages with dual-layer caching (React cache + Next unstable_cache).
 */

import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { Package, PackageStatus } from '@/types/admin';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

async function fetchPackages(
  supabase: SupabaseClient<Database>,
  statusFilter?: 'draft' | 'published' | 'all'
): Promise<Package[]> {
  let query = supabase.from('packages').select('*');

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching packages:', error);
    return [];
  }

  return (data || []).map((pkg) => ({
    id: pkg.id,
    name: pkg.name,
    price: Number(pkg.price),
    features: pkg.features || [],
    status: pkg.status as PackageStatus,
    sortOrder: pkg.sort_order,
    createdAt: pkg.created_at,
    updatedAt: pkg.updated_at,
  }));
}

export async function getCachedPackages(
  statusFilter?: 'draft' | 'published' | 'all'
): Promise<Package[]> {
  const supabase = await createClient();
  const filterKey = statusFilter ?? 'all';

  return unstable_cache(
    async (filter: 'draft' | 'published' | 'all'): Promise<Package[]> => {
      return fetchPackages(supabase, filter);
    },
    [`packages-list-${filterKey}`],
    {
      revalidate: 600,
      tags: ['packages'],
    }
  )(filterKey);
}

export const getPackages = cache(getCachedPackages);
