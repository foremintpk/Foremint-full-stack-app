/**
 * @file src/app/(dashboard)/notifications/page.tsx
 * @description Customer notifications list — full manager with mark-all-read.
 */

import { redirect } from 'next/navigation';
import { getSession, isB2BRole } from '@/lib/auth/get-session';
import { getCachedDashboardData } from '@/lib/dashboard/getDashboardData';
import NotificationsClient from './NotificationsClient';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  let session;
  try {
    session = await getSession();
  } catch {
    redirect('/login');
  }

  // Notifications page is not part of the trimmed B2B navigation.
  if (isB2BRole(session.profile.role)) {
    redirect('/dashboard');
  }

  const data = await getCachedDashboardData(
    session.user.id,
    session.profile.full_name || '',
    session.profile
  );

  return (
    <NotificationsClient
      notifications={data.notifications}
      userId={session.user.id}
    />
  );
}
