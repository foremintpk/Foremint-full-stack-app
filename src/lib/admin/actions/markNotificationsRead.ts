/**
 * @file src/lib/admin/actions/markNotificationsRead.ts
 * @description Server Action to mark all unread notifications for an admin (or their role) as read.
 * 
 * 1. Server vs Client choice rationale: Server Action ('use server').
 * 2. Caching layer: Directly mutates Database and triggers invalidation on Layer 1 cached data.
 * 3. RBAC: Invoked by authenticated administrators or managers from the notification dropdown.
 * 4. Revalidation / Cache Busting: revalidateTag(`notif-count-${adminId}`, 'max') and revalidateTag(`notif-list-${adminId}`, 'max').
 */

'use server';

import { revalidateTag } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { AdminRole } from '@/types/admin';

export async function markAllNotificationsRead(
  adminId: string,
  adminRole: AdminRole
): Promise<{ success: boolean; error?: string }> {
  if (!adminId || !adminRole) {
    return { success: false, error: 'Invalid parameters provided' };
  }

  try {
    const supabase = await createClient();
    const { data: claimsData, error: authErr } = await supabase.auth.getClaims();
    const user = claimsData?.claims ? { id: claimsData.claims.sub } : null;
    if (authErr || !user) return { success: false, error: 'Unauthorized' };

    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single();

    if (profileErr || !profile || profile.is_active !== true ||
        (profile.role !== 'administrator' && profile.role !== 'manager')) {
      return { success: false, error: 'Unauthorized' };
    }

    const verifiedId = user.id;
    const verifiedRole = profile.role as AdminRole;

    const admin = createAdminClient();

    // 1. Update personal notifications (recipient_id matches this admin)
    const { error: personalError } = await admin
      .from('notifications')
      .update({ is_read: true } as any)
      .eq('recipient_id', verifiedId)
      .eq('is_read', false);

    if (personalError) {
      console.error('Error marking personal notifications read:', personalError);
    }

    // 2. Update role-targeted notifications (target_role matches admin's role)
    const { error: roleError } = await admin
      .from('notifications')
      .update({ is_read: true } as any)
      .eq('target_role', verifiedRole)
      .eq('is_read', false);

    if (roleError) {
      console.error('Error marking role notifications read:', roleError);
      return { success: false, error: roleError.message };
    }

    // 3. Invalidate cached dynamic counts/lists
    revalidateTag(`notif-count-${verifiedId}`, 'max');
    revalidateTag(`notif-list-${verifiedId}`, 'max');
    revalidateTag('notif-count-admin', 'max');
    revalidateTag('notif-list-admin', 'max');

    return { success: true };
  } catch (err: any) {
    console.error('Unhandled exception in markAllNotificationsRead action:', err);
    return { success: false, error: err?.message || 'Unexpected server error' };
  }
}

export async function markNotificationRead(
  notificationId: string,
  adminId: string
): Promise<{ success: boolean; error?: string }> {
  if (!notificationId || !adminId) {
    return { success: false, error: 'Invalid parameters provided' };
  }

  try {
    const admin = createAdminClient();

    const { error } = await admin
      .from('notifications')
      .update({ is_read: true } as any)
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification read:', error);
      return { success: false, error: error.message };
    }

    revalidateTag(`notif-count-${adminId}`, 'max');
    revalidateTag(`notif-list-${adminId}`, 'max');
    revalidateTag('notif-count-admin', 'max');
    revalidateTag('notif-list-admin', 'max');

    return { success: true };
  } catch (err: any) {
    console.error('Unhandled exception in markNotificationRead action:', err);
    return { success: false, error: err?.message || 'Unexpected server error' };
  }
}
