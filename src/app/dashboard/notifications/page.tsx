/**
 * @file src/app/(dashboard)/notifications/page.tsx
 * @description Customer notifications list — full manager with mark-all-read.
 */

import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
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

  const data = await getCachedDashboardData();

  return (
    <NotificationsClient
      notifications={data.notifications}
      userId={session.user.id}
    />
  );
}
