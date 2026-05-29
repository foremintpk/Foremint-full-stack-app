/**
 * @file src/lib/admin/actions/packageActions.ts
 * @description Server Actions for managing packages in the admin panel.
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import { PackageStatus } from '@/types/admin';

// Typecast cache revalidation methods for Next.js 16 compiler compatibility
const revalidateTagTyped = revalidateTag as unknown as (tag: string) => void;
const revalidatePathTyped = revalidatePath as unknown as (path: string, type?: 'layout' | 'page') => void;

function parseFeatures(raw: string): string[] {
  return raw
    .split('\n')
    .map((f) => f.trim())
    .filter(Boolean);
}

async function verifyAdminRole() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'administrator' && profile.role !== 'manager')) {
    throw new Error('Unauthorized');
  }

  return supabase;
}

export async function createPackage(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await verifyAdminRole();

    const name = formData.get('name') as string;
    const priceStr = formData.get('price') as string;
    const status = formData.get('status') as PackageStatus;
    const sortOrderStr = formData.get('sortOrder') as string;
    const featuresRaw = formData.get('featuresRaw') as string;

    if (!name) {
      return { success: false, error: 'Package name is required' };
    }

    const price = Number(priceStr);
    if (isNaN(price) || price < 0) {
      return { success: false, error: 'Price must be a valid number >= 0' };
    }

    const sortOrder = sortOrderStr ? Number(sortOrderStr) : 0;
    const features = featuresRaw ? parseFeatures(featuresRaw) : [];

    const { error: insertError } = await supabase.from('packages').insert({
      name,
      price,
      status,
      sort_order: sortOrder,
      features,
    });

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    // Revalidate
    revalidateTagTyped('packages');
    revalidatePathTyped('/admin/packages', 'page');
    revalidatePathTyped('/admin', 'layout');

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred';
    return { success: false, error: message };
  }
}

export async function updatePackage(
  id: string,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await verifyAdminRole();

    const name = formData.get('name') as string;
    const priceStr = formData.get('price') as string;
    const status = formData.get('status') as PackageStatus;
    const sortOrderStr = formData.get('sortOrder') as string;
    const featuresRaw = formData.get('featuresRaw') as string;

    if (!name) {
      return { success: false, error: 'Package name is required' };
    }

    const price = Number(priceStr);
    if (isNaN(price) || price < 0) {
      return { success: false, error: 'Price must be a valid number >= 0' };
    }

    const sortOrder = sortOrderStr ? Number(sortOrderStr) : 0;
    const features = featuresRaw ? parseFeatures(featuresRaw) : [];

    const { error: updateError } = await supabase
      .from('packages')
      .update({
        name,
        price,
        status,
        sort_order: sortOrder,
        features,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Revalidate
    revalidateTagTyped('packages');
    revalidatePathTyped('/admin/packages', 'page');
    revalidatePathTyped('/admin', 'layout');

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred';
    return { success: false, error: message };
  }
}

export async function deletePackage(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await verifyAdminRole();

    const { error: deleteError } = await supabase
      .from('packages')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }

    // Revalidate
    revalidateTagTyped('packages');
    revalidatePathTyped('/admin/packages', 'page');
    revalidatePathTyped('/admin', 'layout');

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred';
    return { success: false, error: message };
  }
}

export async function togglePackageStatus(
  id: string,
  currentStatus: PackageStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await verifyAdminRole();
    const newStatus: PackageStatus = currentStatus === 'published' ? 'draft' : 'published';

    const { error: updateError } = await supabase
      .from('packages')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Revalidate
    revalidateTagTyped('packages');
    revalidatePathTyped('/admin/packages', 'page');
    revalidatePathTyped('/admin', 'layout');

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred';
    return { success: false, error: message };
  }
}
