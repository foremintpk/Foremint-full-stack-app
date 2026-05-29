/**
 * @file src/lib/admin/getAdminUser.ts
 * @description Retrieves the authenticated admin user profile, wrapped in React cache() for request deduplication.
 * 
 * 1. Server vs Client choice rationale: Server Component utility.
 * 2. Caching layer: React cache() (per-request deduplication within a single render tree).
 *    - An outer unstable_cache is NOT applied here because the live identity changes on sign-in/sign-out and must always reflect the live session.
 * 3. RBAC: Restricts returning a profile only if the user is an administrator or manager.
 * 4. Revalidation / Cache Busting: Handled per-render cycle natively by Next.js.
 */

import { cache } from 'react';
import { getSessionSafe } from '@/lib/auth/get-session';
import { AdminProfile } from '@/types/admin';

export const getAdminUser = cache(async (): Promise<AdminProfile | null> => {
  const session = await getSessionSafe();
  if (!session) return null;
  
  const { profile } = session;
  if (profile.role !== 'administrator' && profile.role !== 'manager') {
    return null;
  }
  
  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    phone: profile.phone,
    role: profile.role as any, // Cast to avoid any role mismatch with AdminProfile role
    avatarUrl: profile.avatar_url,
    isActive: profile.is_active,
    createdAt: profile.created_at || null,
  };
});
