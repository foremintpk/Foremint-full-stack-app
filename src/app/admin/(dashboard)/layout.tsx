/**
 * @file src/app/admin/(dashboard)/layout.tsx
 * @description Main dashboard wrapper loading initial cached states for unread badges and notifications.
 * 
 * 1. Server vs Client choice rationale: Server Component. Handles server-side pre-fetching of counts and arrays to pass down as initial props to the shell.
 * 2. Caching layer: Layer 3 - Route Segment Config (revalidate = 60). Holds cached layout renders up to 60s in the Next.js Full Route Cache.
 *    - getAdminUser() uses request deduplication React cache().
 *    - getCachedUnreadNotifications() uses 30s unstable_cache TTL.
 *    - getUnreadOrderCount() uses 60s unstable_cache TTL.
 * 3. RBAC: Inherited from root admin layout.
 * 4. Revalidation / Cache Busting: revalidate = 60 or manual revalidation triggers.
 */

import { redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/admin/getAdminUser';
import { getCachedUnreadNotifications } from '@/lib/admin/getUnreadNotifications';
import { getCachedUnreadOrderCount } from '@/lib/admin/getUnreadOrderCount';
import { AdminShell } from '@/components/admin/AdminShell';
import { AdminRole } from '@/types/admin';

export const revalidate = 60; // Hold layout renders in Full Route Cache for max 60s

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getAdminUser();

  if (!admin) {
    redirect('/sign-in?redirect=/admin' as any);
  }

  // Pre-fetch unread counts and dynamic arrays (hits Layer 1 server unstable_cache)
  const [unreadNotifications, unreadOrderCount] = await Promise.all([
    getCachedUnreadNotifications(admin.id, admin.role as AdminRole),
    getCachedUnreadOrderCount(admin.id),
  ]);

  return (
    <AdminShell
      adminProfile={admin}
      badgeCounts={{
        llcRegistrations: unreadOrderCount,
        notifications: unreadNotifications.length,
      }}
      initialNotifications={unreadNotifications}
    >
      {children}
    </AdminShell>
  );
}
