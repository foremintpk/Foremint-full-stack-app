// src/lib/onboarding/getPublicPackages.ts
import { createClient } from '@/lib/supabase/server'
import { unstable_cache } from 'next/cache'
import type { PublicPackage } from '@/types/onboarding'

export const getPublicPackages = unstable_cache(
  async (): Promise<PublicPackage[]> => {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('packages')
      .select('id, name, price, features, sort_order')
      .eq('status', 'published')
      .order('sort_order', { ascending: true })

    if (error || !data) return []

    return data.map(pkg => ({
      id: pkg.id,
      name: pkg.name,
      price: Number(pkg.price),
      features: Array.isArray(pkg.features) ? pkg.features : [],
      sortOrder: pkg.sort_order,
    }))
  },
  ['public-packages'],
  { revalidate: 600, tags: ['packages'] }
)
