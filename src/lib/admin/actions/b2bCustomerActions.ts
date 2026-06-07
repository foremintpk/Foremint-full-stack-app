/**
 * @file src/lib/admin/actions/b2bCustomerActions.ts
 * @description Server Actions for managing B2B customers and their read-only LLC
 * order assignments. All actions are administrator-gated.
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidateTag, revalidatePath } from 'next/cache';

const revalidatePathTyped = revalidatePath as unknown as (path: string, type?: 'layout' | 'page') => void;

async function verifyAdminRole() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims ? { id: claimsData.claims.sub } : null;

  if (!user) {
    throw new Error('Unauthorized');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (!profile || profile.is_active !== true || profile.role !== 'administrator') {
    throw new Error('Only administrators are authorized to manage B2B customers.');
  }

  return { actorId: user.id };
}

function revalidateB2B(userId?: string) {
  revalidateTag('user-list', 'max');
  revalidatePathTyped('/admin/b2b-customers', 'page');
  revalidatePathTyped('/admin/users', 'page');
  revalidatePathTyped('/admin', 'layout');
  if (userId) {
    revalidateTag(`customer-dashboard-${userId}`, 'max');
    revalidateTag(`b2b-assignments-${userId}`, 'max');
  }
}

/**
 * Replaces the full set of assigned order ids for a B2B customer.
 * Deletes rows no longer present and inserts new ones.
 */
async function syncAssignments(
  adminClient: ReturnType<typeof createAdminClient>,
  b2bUserId: string,
  orderIds: string[],
  actorId: string
): Promise<string | null> {
  const desired = Array.from(new Set(orderIds.filter(Boolean)));

  const { data: existing, error: exErr } = await adminClient
    .from('b2b_order_assignments')
    .select('order_id')
    .eq('b2b_user_id', b2bUserId);

  if (exErr) return exErr.message;

  const existingIds = new Set((existing || []).map((r) => r.order_id));
  const desiredSet = new Set(desired);

  const toAdd = desired.filter((id) => !existingIds.has(id));
  const toRemove = [...existingIds].filter((id) => !desiredSet.has(id));

  if (toRemove.length > 0) {
    const { error: delErr } = await adminClient
      .from('b2b_order_assignments')
      .delete()
      .eq('b2b_user_id', b2bUserId)
      .in('order_id', toRemove);
    if (delErr) return delErr.message;
  }

  if (toAdd.length > 0) {
    const { error: insErr } = await adminClient
      .from('b2b_order_assignments')
      .insert(
        toAdd.map((order_id) => ({
          b2b_user_id: b2bUserId,
          order_id,
          assigned_by: actorId,
        }))
      );
    if (insErr) return insErr.message;
  }

  return null;
}

export async function createB2BCustomer(formData: FormData): Promise<{ error?: string }> {
  try {
    const { actorId } = await verifyAdminRole();
    const adminClient = createAdminClient();

    const email = (formData.get('email') as string)?.trim();
    const password = (formData.get('password') as string)?.trim();
    const fullName = (formData.get('fullName') as string)?.trim();
    const phone = (formData.get('phone') as string)?.trim();
    const orderIds = formData.getAll('orderIds').map((v) => String(v));

    if (!email || !password) {
      return { error: 'Email and password are required.' };
    }
    if (password.length < 8) {
      return { error: 'Password must be at least 8 characters.' };
    }

    // 1. Create the auth user (no email verification). The handle_new_user trigger
    // creates the profiles row from user_metadata (role + full_name).
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName || '',
        role: 'b2b_customer',
      },
    });

    if (authError) return { error: authError.message };
    if (!authData.user) return { error: 'Failed to create B2B customer account.' };

    // 2. Fill in remaining profile fields.
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({
        phone: phone || null,
        full_name: fullName || null,
        is_active: true,
      })
      .eq('id', authData.user.id);

    if (profileError) {
      await adminClient.auth.admin.deleteUser(authData.user.id);
      return { error: profileError.message };
    }

    // 3. Assign selected LLC orders.
    if (orderIds.length > 0) {
      const assignErr = await syncAssignments(adminClient, authData.user.id, orderIds, actorId);
      if (assignErr) return { error: `User created, but assignment failed: ${assignErr}` };
    }

    revalidateB2B(authData.user.id);
    return {};
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred' };
  }
}

export async function updateB2BCustomer(id: string, formData: FormData): Promise<{ error?: string }> {
  try {
    const { actorId } = await verifyAdminRole();
    const adminClient = createAdminClient();

    const email = (formData.get('email') as string)?.trim();
    const password = (formData.get('password') as string)?.trim();
    const fullName = (formData.get('fullName') as string)?.trim();
    const phone = (formData.get('phone') as string)?.trim();
    const orderIds = formData.getAll('orderIds').map((v) => String(v));

    if (!email) return { error: 'Email is required.' };

    // Current email to detect a change.
    const { data: target, error: targetErr } = await adminClient
      .from('profiles')
      .select('email, role')
      .eq('id', id)
      .single();

    if (targetErr || !target) return { error: 'B2B customer not found.' };

    // 1. Update auth (email / password / metadata).
    const authUpdates: { email?: string; password?: string; user_metadata?: Record<string, any> } = {};
    if (email.toLowerCase() !== (target.email || '').toLowerCase()) {
      authUpdates.email = email;
    }
    if (password && password.length > 0) {
      if (password.length < 8) return { error: 'Password must be at least 8 characters.' };
      authUpdates.password = password;
    }
    authUpdates.user_metadata = { full_name: fullName || '', role: 'b2b_customer' };

    const { error: authError } = await adminClient.auth.admin.updateUserById(id, authUpdates);
    if (authError) return { error: authError.message };

    // 2. Update profile.
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({
        email,
        full_name: fullName || null,
        phone: phone || null,
        role: 'b2b_customer',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (profileError) return { error: profileError.message };

    // 3. Sync assignments.
    const assignErr = await syncAssignments(adminClient, id, orderIds, actorId);
    if (assignErr) return { error: `Profile updated, but assignment sync failed: ${assignErr}` };

    revalidateB2B(id);
    return {};
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred' };
  }
}

export async function deleteB2BCustomer(id: string): Promise<{ error?: string }> {
  try {
    const { actorId } = await verifyAdminRole();
    const adminClient = createAdminClient();

    if (id === actorId) {
      return { error: 'Self-deletion is prevented for security.' };
    }

    // Assignments cascade via FK on delete. Remove profile then the auth user.
    const { error: profileError } = await adminClient
      .from('profiles')
      .delete()
      .eq('id', id);

    if (profileError) return { error: profileError.message };

    const { error: authError } = await adminClient.auth.admin.deleteUser(id);
    if (authError) return { error: authError.message };

    revalidateB2B(id);
    return {};
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred' };
  }
}
