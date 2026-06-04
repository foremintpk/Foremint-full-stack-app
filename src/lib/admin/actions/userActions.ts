/**
 * @file src/lib/admin/actions/userActions.ts
 * @description Server Actions for managing users via the Supabase Admin client.
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidateTag, revalidatePath } from 'next/cache';
import { UserRole } from '@/types/admin';

const revalidatePathTyped = revalidatePath as unknown as (path: string, type?: 'layout' | 'page') => void;

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

  if (!profile || profile.role !== 'administrator') {
    throw new Error('Only administrators are authorized to perform user management actions.');
  }

  return { supabase, actorId: user.id };
}

export async function createUser(formData: FormData): Promise<{ error?: string }> {
  try {
    const { actorId } = await verifyAdminRole();
    const adminClient = createAdminClient();

    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;
    const phone = formData.get('phone') as string;
    const role = formData.get('role') as UserRole;

    if (!email || !password || !role) {
      return { error: 'Email, password, and role are required.' };
    }

    // 1. Create user in auth.users passing fullName and role as user_metadata
    // This allows handle_new_user() trigger to automatically create the profiles row with correct attributes.
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName || '',
        role: role,
      }
    });

    if (authError) {
      return { error: authError.message };
    }

    if (!authData.user) {
      return { error: 'Failed to create user account.' };
    }

    // 2. Update remaining fields (phone) and attributes using adminClient to bypass RLS
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({
        phone: phone || null,
        full_name: fullName || null,
        is_active: true,
      })
      .eq('id', authData.user.id);

    if (profileError) {
      // Clean up the auth user if profile update failed
      await adminClient.auth.admin.deleteUser(authData.user.id);
      return { error: profileError.message };
    }

    // 3. Revalidate
    revalidateTag('user-list', 'max');
    revalidatePathTyped('/admin/users', 'page');
    revalidatePathTyped('/admin', 'layout');

    return {};
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred';
    return { error: message };
  }
}

export async function updateUser(id: string, formData: FormData): Promise<{ error?: string }> {
  try {
    const { supabase, actorId } = await verifyAdminRole();
    const adminClient = createAdminClient();

    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;
    const phone = formData.get('phone') as string;
    const role = formData.get('role') as UserRole;

    if (!email || !role) {
      return { error: 'Email and role are required.' };
    }

    // Get current profile email to see if it changed
    const { data: targetProfile, error: targetError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', id)
      .single();

    if (targetError || !targetProfile) {
      return { error: 'User profile not found.' };
    }

    // 1. Update auth.users if email, password, or user metadata changed
    const authUpdates: { email?: string; password?: string; user_metadata?: Record<string, any> } = {};
    if (email.toLowerCase().trim() !== targetProfile.email?.toLowerCase().trim()) {
      authUpdates.email = email;
    }
    if (password && password.trim().length > 0) {
      authUpdates.password = password;
    }
    authUpdates.user_metadata = {
      full_name: fullName || '',
      role: role,
    };

    const { error: authError } = await adminClient.auth.admin.updateUserById(id, authUpdates);
    if (authError) {
      return { error: authError.message };
    }

    // 2. Update profiles table using adminClient to bypass RLS
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({
        email,
        full_name: fullName || null,
        phone: phone || null,
        role,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (profileError) {
      return { error: profileError.message };
    }

    // 3. Revalidate
    revalidateTag('user-list', 'max');
    revalidatePathTyped('/admin/users', 'page');
    revalidatePathTyped('/admin', 'layout');

    return {};
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred';
    return { error: message };
  }
}

export async function deactivateUser(id: string, currentIsActive: boolean): Promise<{ error?: string }> {
  try {
    const { actorId } = await verifyAdminRole();
    const adminClient = createAdminClient();

    if (id === actorId) {
      return { error: 'Self-deactivation is prevented for security.' };
    }

    // 1. Update profiles table using adminClient to bypass RLS
    const nextActive = !currentIsActive;
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({
        is_active: nextActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (profileError) {
      return { error: profileError.message };
    }

    // 2. Ban/unban in Auth
    const banDuration = nextActive ? 'none' : '876600h'; // 876600h is 100 years
    const { error: authError } = await adminClient.auth.admin.updateUserById(id, {
      ban_duration: banDuration,
    });

    if (authError) {
      return { error: authError.message };
    }

    // 3. Revalidate
    revalidateTag('user-list', 'max');
    revalidatePathTyped('/admin/users', 'page');
    revalidatePathTyped('/admin', 'layout');

    return {};
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred';
    return { error: message };
  }
}

export async function deleteUser(id: string): Promise<{ error?: string }> {
  try {
    const { actorId } = await verifyAdminRole();
    const adminClient = createAdminClient();

    if (id === actorId) {
      return { error: 'Self-deletion is prevented for security.' };
    }

    // 1. Delete from profiles first using adminClient to bypass RLS
    const { error: profileError } = await adminClient
      .from('profiles')
      .delete()
      .eq('id', id);

    if (profileError) {
      return { error: profileError.message };
    }

    // 2. Delete from Auth
    const { error: authError } = await adminClient.auth.admin.deleteUser(id);
    if (authError) {
      return { error: authError.message };
    }

    // 3. Revalidate
    revalidateTag('user-list', 'max');
    revalidatePathTyped('/admin/users', 'page');
    revalidatePathTyped('/admin', 'layout');

    return {};
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred';
    return { error: message };
  }
}
