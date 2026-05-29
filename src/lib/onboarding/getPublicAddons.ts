import { createClient } from '@/lib/supabase/server'
import { unstable_cache } from 'next/cache'
import type { PublicAddon, PublicAddonCategory } from '@/types/onboarding'

export const getPublicAddons = unstable_cache(
  async (): Promise<{ addons: PublicAddon[]; categories: PublicAddonCategory[] }> => {
    const supabase = await createClient()

    const [addonsResult, categoriesResult] = await Promise.all([
      supabase
        .from('addons')
        .select(`
          id, name, price, features,
          addon_category_map (
            category_id,
            addon_categories ( id, name )
          )
        `)
        .eq('status', 'published')
        .order('id'),

      supabase
        .from('addon_categories')
        .select('id, name')
        .order('name'),
    ])

    const addons: PublicAddon[] = (addonsResult.data ?? []).map(a => {
      const categoryMaps = (a.addon_category_map ?? []) as unknown as Array<{
        category_id: string
        addon_categories: { id: string; name: string } | null
      }>
      return {
        id: a.id,
        name: a.name,
        price: Number(a.price),
        features: Array.isArray(a.features) ? a.features : [],
        categoryIds: categoryMaps.map(m => m.category_id),
        categoryNames: categoryMaps
          .map(m => m.addon_categories?.name ?? '')
          .filter(Boolean),
      }
    })

    const categories: PublicAddonCategory[] = (categoriesResult.data ?? []).map(c => ({
      id: c.id,
      name: c.name,
    }))

    return { addons, categories }
  },
  ['public-addons'],
  { revalidate: 600, tags: ['addons', 'addon-categories'] }
)
