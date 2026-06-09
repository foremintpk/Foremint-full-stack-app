import { redirect } from 'next/navigation';
import { getSession, isB2BRole, AccountDisabledError } from '@/lib/auth/get-session';
import { createClient } from '@/lib/supabase/server';
import { getCachedDashboardData, getCachedB2BDashboardData } from '@/lib/dashboard/getDashboardData';
import { getCustomerBadgeCounts } from '@/lib/dashboard/getCustomerBadgeCounts';
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
  } catch (err) {
    if (err instanceof AccountDisabledError) {
      const supabase = await createClient();
      await supabase.auth.signOut();
      redirect('/login?reason=account-disabled');
    }
    redirect('/login');
  }

  const isB2B = isB2BRole(session.profile.role);

  // Retrieve initial dashboard states for badges & notifications (hits Layer 1 cache)
  const name = session.profile.full_name || '';
  // Same React cache()-wrapped functions page.tsx uses — sharing the wrapper
  // (not the raw function) lets request-scoped memoization dedupe the underlying
  // fetchDashboardDataQuery call between layout and page (mirrors the O4 fix
  // where the admin layout switched to share getUnreadOrderCount's memoization).
  const data = isB2B
    ? await getCachedB2BDashboardData(session.user.id, name, session.profile)
    : await getCachedDashboardData(session.user.id, name, session.profile);

  const initialLlcNames = Object.fromEntries(
    data.llcs.map((llc) => [llc.id, llc.llcName])
  );

  // getCustomerBadgeCounts() is uncached and hits the DB directly —
  // this gives the shell accurate ticket/action/notification counts at
  // initial render without relying on the 30-second unstable_cache layer.
  const badgeCounts = await getCustomerBadgeCounts();

  return (
    <DashboardShell
      profile={data.profile}
      initialNotifications={data.notifications}
      initialLlcNames={initialLlcNames}
      isB2B={isB2B}
      badgeCounts={badgeCounts}
    >
      {children}
    </DashboardShell>
  );
}
