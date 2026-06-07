'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidateTag, revalidatePath } from 'next/cache';


export async function createAddon(formData: FormData): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    
    // Auth Check
    const { data: claimsData } = await supabase.auth.getClaims();
    const user = claimsData?.claims ? { id: claimsData.claims.sub } : null;
    if (!user) return { error: 'Unauthorized' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single();

    if (profile?.is_active !== true || (profile?.role !== 'administrator' && profile?.role !== 'manager')) {
      return { error: 'Insufficient permissions' };
    }

    // Parse Data
    const name = formData.get('name') as string;
    const priceStr = formData.get('price') as string;
    const status = formData.get('status') as string;
    const featuresRaw = formData.get('featuresRaw') as string;
    const categoryIds = formData.getAll('categoryIds') as string[];

    if (!name || !name.trim()) return { error: 'Name is required' };
    if (!priceStr || isNaN(Number(priceStr))) return { error: 'Valid price is required' };
    if (status !== 'draft' && status !== 'published') return { error: 'Invalid status' };

    const features = (featuresRaw || '')
      .split('\n')
      .map(f => f.trim())
      .filter(f => f.length > 0);

    const price = Number(priceStr);

    // Insert Addon
    const { data: addon, error: insertError } = await supabase
      .from('addons')
      .insert({
        name: name.trim(),
        price,
        features,
        status,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Insert Addon Error:', insertError);
      return { error: insertError.message || 'Failed to create addon' };
    }

    // Insert Category Mappings
    if (categoryIds.length > 0) {
      const mappings = categoryIds.map(categoryId => ({
        addon_id: addon.id,
        category_id: categoryId,
      }));

      const { error: mapError } = await supabase
        .from('addon_category_map')
        .insert(mappings);

      if (mapError) {
        console.error('Insert Addon Categories Error:', mapError);
        return { error: 'Addon created but failed to assign categories' };
      }
    }

    revalidateTag('addon-list', 'max');
    revalidatePath('/admin/addons', 'page');
    revalidatePath('/admin', 'layout');

    return {};
  } catch (err: any) {
    console.error('Create Addon Error:', err);
    return { error: err.message || 'An unexpected error occurred' };
  }
}

export async function updateAddon(id: string, formData: FormData): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    
    // Auth Check
    const { data: claimsData } = await supabase.auth.getClaims();
    const user = claimsData?.claims ? { id: claimsData.claims.sub } : null;
    if (!user) return { error: 'Unauthorized' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single();

    if (profile?.is_active !== true || (profile?.role !== 'administrator' && profile?.role !== 'manager')) {
      return { error: 'Insufficient permissions' };
    }

    // Parse Data
    const name = formData.get('name') as string;
    const priceStr = formData.get('price') as string;
    const status = formData.get('status') as string;
    const featuresRaw = formData.get('featuresRaw') as string;
    const categoryIds = formData.getAll('categoryIds') as string[];

    if (!name || !name.trim()) return { error: 'Name is required' };
    if (!priceStr || isNaN(Number(priceStr))) return { error: 'Valid price is required' };
    if (status !== 'draft' && status !== 'published') return { error: 'Invalid status' };

    const features = (featuresRaw || '')
      .split('\n')
      .map(f => f.trim())
      .filter(f => f.length > 0);

    const price = Number(priceStr);

    // Update Addon
    const { error: updateError } = await supabase
      .from('addons')
      .update({
        name: name.trim(),
        price,
        features,
        status,
      })
      .eq('id', id);

    if (updateError) {
      console.error('Update Addon Error:', updateError);
      return { error: updateError.message || 'Failed to update addon' };
    }

    // Replace Category Mappings
    const { error: delError } = await supabase
      .from('addon_category_map')
      .delete()
      .eq('addon_id', id);

    if (delError) {
      console.error('Delete Addon Categories Error:', delError);
      return { error: 'Failed to update categories' };
    }

    if (categoryIds.length > 0) {
      const mappings = categoryIds.map(categoryId => ({
        addon_id: id,
        category_id: categoryId,
      }));

      const { error: mapError } = await supabase
        .from('addon_category_map')
        .insert(mappings);

      if (mapError) {
        console.error('Insert Addon Categories Error:', mapError);
        return { error: 'Failed to assign new categories' };
      }
    }

    revalidateTag('addon-list', 'max');
    revalidatePath('/admin/addons', 'page');
    revalidatePath('/admin', 'layout');

    return {};
  } catch (err: any) {
    console.error('Update Addon Error:', err);
    return { error: err.message || 'An unexpected error occurred' };
  }
}

export async function deleteAddon(id: string): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    
    // Auth Check
    const { data: claimsData } = await supabase.auth.getClaims();
    const user = claimsData?.claims ? { id: claimsData.claims.sub } : null;
    if (!user) return { error: 'Unauthorized' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single();

    if (profile?.is_active !== true || profile?.role !== 'administrator') {
      return { error: 'Only administrators can delete addons' };
    }

    const { error } = await supabase
      .from('addons')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete Addon Error:', error);
      return { error: error.message || 'Failed to delete addon' };
    }

    revalidateTag('addon-list', 'max');
    revalidatePath('/admin/addons', 'page');
    revalidatePath('/admin', 'layout');

    return {};
  } catch (err: any) {
    console.error('Delete Addon Error:', err);
    return { error: err.message || 'An unexpected error occurred' };
  }
}

export async function createAddonCategory(formData: FormData): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    
    const { data: claimsData } = await supabase.auth.getClaims();
    const user = claimsData?.claims ? { id: claimsData.claims.sub } : null;
    if (!user) return { error: 'Unauthorized' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single();

    if (profile?.is_active !== true || (profile?.role !== 'administrator' && profile?.role !== 'manager')) {
      return { error: 'Insufficient permissions' };
    }

    const name = formData.get('name') as string;
    if (!name || !name.trim()) return { error: 'Category name is required' };

    const { error } = await supabase
      .from('addon_categories')
      .insert({ name: name.trim() });

    if (error) {
      console.error('Create Category Error:', error);
      return { error: error.message || 'Failed to create category' };
    }

    revalidateTag('addon-categories', 'max');
    revalidateTag('addon-list', 'max');

    return {};
  } catch (err: any) {
    console.error('Create Category Error:', err);
    return { error: err.message || 'An unexpected error occurred' };
  }
}

export async function updateAddonCategory(id: string, formData: FormData): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    
    const { data: claimsData } = await supabase.auth.getClaims();
    const user = claimsData?.claims ? { id: claimsData.claims.sub } : null;
    if (!user) return { error: 'Unauthorized' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single();

    if (profile?.is_active !== true || (profile?.role !== 'administrator' && profile?.role !== 'manager')) {
      return { error: 'Insufficient permissions' };
    }

    const name = formData.get('name') as string;
    if (!name || !name.trim()) return { error: 'Category name is required' };

    const { error } = await supabase
      .from('addon_categories')
      .update({ name: name.trim() })
      .eq('id', id);

    if (error) {
      console.error('Update Category Error:', error);
      return { error: error.message || 'Failed to update category' };
    }

    revalidateTag('addon-categories', 'max');
    revalidateTag('addon-list', 'max');

    return {};
  } catch (err: any) {
    console.error('Update Category Error:', err);
    return { error: err.message || 'An unexpected error occurred' };
  }
}

export async function deleteAddonCategory(id: string): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    
    const { data: claimsData } = await supabase.auth.getClaims();
    const user = claimsData?.claims ? { id: claimsData.claims.sub } : null;
    if (!user) return { error: 'Unauthorized' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single();

    if (profile?.is_active !== true || profile?.role !== 'administrator') {
      return { error: 'Only administrators can delete categories' };
    }

    const { error } = await supabase
      .from('addon_categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete Category Error:', error);
      return { error: error.message || 'Failed to delete category' };
    }

    revalidateTag('addon-categories', 'max');
    revalidateTag('addon-list', 'max');

    return {};
  } catch (err: any) {
    console.error('Delete Category Error:', err);
    return { error: err.message || 'An unexpected error occurred' };
  }
}
