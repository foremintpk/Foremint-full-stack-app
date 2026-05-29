import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { getDashboardData } from '@/lib/dashboard/getDashboardData';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

export const revalidate = 60; // Hold layout renders in Full Route Cache for max 60s

export default async function CustomerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session;
  try {
    session = await getSession();
  } catch {
    redirect('/login');
  }

  // Retrieve initial dashboard states for badges & notifications (hits Layer 1 cache)
  const name = session.profile.full_name || '';
  const email = session.profile.email || '';
  const data = await getDashboardData(session.user.id, name, email);

  const notificationsCount = data.notifications.filter(n => !n.isRead).length;
  const actionsCount = data.actions.length;
  const initialLlcNames = Object.fromEntries(
    data.llcs.map((llc) => [llc.id, llc.llcName])
  );

  return (
    <DashboardShell
      profile={data.profile}
      initialNotifications={data.notifications}
      initialLlcNames={initialLlcNames}
      badgeCounts={{
        notifications: notificationsCount,
        actions: actionsCount,
      }}
    >
      {children}
    </DashboardShell>
  );
}
