/**
 * @file src/lib/admin/actions/markNotificationsRead.ts
 * @description Server Action to mark all unread notifications for an admin (or their role) as read.
 * 
 * 1. Server vs Client choice rationale: Server Action ('use server').
 * 2. Caching layer: Directly mutates Database and triggers invalidation on Layer 1 cached data.
 * 3. RBAC: Invoked by authenticated administrators or managers from the notification dropdown.
 * 4. Revalidation / Cache Busting: revalidateTag(`notif-count-${adminId}`) and revalidateTag(`notif-list-${adminId}`).
 */

'use server';

import { revalidateTag } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
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

    // 1. Update personal notifications
    const { error: personalError } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_id', adminId)
      .eq('is_read', false);

    if (personalError) {
      console.error('Error marking personal notifications read:', personalError);
    }

    // 2. Update role-targeted notifications
    const { error: roleError } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('target_role', adminRole)
      .eq('is_read', false);

    if (roleError) {
      console.error('Error marking role notifications read:', roleError);
    }

    if (personalError || roleError) {
      return { 
        success: false, 
        error: personalError?.message || roleError?.message || 'Failed to mark some notifications as read' 
      };
    }

    // 3. Invalidate cached dynamic counts/lists
    (revalidateTag as any)(`notif-count-${adminId}`);
    (revalidateTag as any)(`notif-list-${adminId}`);
    (revalidateTag as any)('notif-count-admin');
    (revalidateTag as any)('notif-list-admin');

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
    const supabase = await createClient();

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification read:', error);
      return { success: false, error: error.message };
    }

    // Invalidate cached dynamic counts/lists
    (revalidateTag as any)(`notif-count-${adminId}`);
    (revalidateTag as any)(`notif-list-${adminId}`);
    (revalidateTag as any)('notif-count-admin');
    (revalidateTag as any)('notif-list-admin');

    return { success: true };
  } catch (err: any) {
    console.error('Unhandled exception in markNotificationRead action:', err);
    return { success: false, error: err?.message || 'Unexpected server error' };
  }
}
