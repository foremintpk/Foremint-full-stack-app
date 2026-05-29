import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const revalidate = 0; // Bypass Next.js route cache

export async function GET() {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch published addons
    const { data: addons, error: addonsError } = await supabaseAdmin
      .from('addons')
      .select('*')
      .eq('status', 'published')
      .order('name', { ascending: true });

    if (addonsError) {
      return NextResponse.json({ error: addonsError.message }, { status: 500 });
    }

    // Fetch addon categories
    const { data: categories, error: categoriesError } = await supabaseAdmin
      .from('addon_categories')
      .select('*')
      .order('name', { ascending: true });

    if (categoriesError) {
      return NextResponse.json({ error: categoriesError.message }, { status: 500 });
    }

    // Fetch mappings
    const { data: mappings, error: mappingsError } = await supabaseAdmin
      .from('addon_category_map')
      .select('*');

    if (mappingsError) {
      return NextResponse.json({ error: mappingsError.message }, { status: 500 });
    }

    // Map categories by ID for quick lookup
    const categoryMap = new Map<string, string>();
    (categories || []).forEach(cat => {
      categoryMap.set(cat.id, cat.name);
    });

    // Map addon to their category IDs and names
    const addonCategoriesMap = new Map<string, Array<{ id: string; name: string }>>();
    (mappings || []).forEach(map => {
      const catName = categoryMap.get(map.category_id);
      if (catName) {
        if (!addonCategoriesMap.has(map.addon_id)) {
          addonCategoriesMap.set(map.addon_id, []);
        }
        addonCategoriesMap.get(map.addon_id)!.push({
          id: map.category_id,
          name: catName
        });
      }
    });

    const mappedAddons = (addons || []).map((addon) => ({
      id: addon.id,
      name: addon.name,
      price: Number(addon.price),
      features: addon.features || [],
      status: addon.status,
      categories: addonCategoriesMap.get(addon.id) || [],
      createdAt: addon.created_at,
      updatedAt: addon.updated_at,
    }));

    return NextResponse.json({
      addons: mappedAddons,
      categories: categories || []
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
