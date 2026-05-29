import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { AddonCategory } from '@/types/admin';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

async function fetchAddonCategories(
  supabase: SupabaseClient<Database>
): Promise<AddonCategory[]> {
  const { data, error } = await supabase
    .from('addon_categories')
    .select('id, name, created_at')
    .order('name', { ascending: true });
    
  if (error) throw error;
  
  return (data ?? []).map(r => ({
    id: r.id,
    name: r.name,
    createdAt: r.created_at,
  })) as AddonCategory[];
}

async function getCachedAddonCategories(): Promise<AddonCategory[]> {
  // createClient() (which calls cookies()) lives OUTSIDE unstable_cache — required by Next.js 15+
  const supabase = await createClient();

  return unstable_cache(
    async () => {
      return fetchAddonCategories(supabase);
    },
    ['addon-categories'],
    { revalidate: 300, tags: ['addon-categories'] }
  )();
}

export const getAddonCategories = cache(getCachedAddonCategories);
