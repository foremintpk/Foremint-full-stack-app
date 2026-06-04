/**
 * @file src/app/(dashboard)/billing/page.tsx
 * @description Billing overview — orders invoices + manual invoices + payment
 */

import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/get-session';
import { getCachedDashboardData } from '@/lib/dashboard/getDashboardData';
import BillingClient from './BillingClient';

export const dynamic = 'force-dynamic';

export default async function BillingPage() {
  let session;
  try {
    session = await getSession();
  } catch {
    redirect('/login');
  }

  const data = await getCachedDashboardData(
    session.user.id,
    session.profile.full_name || ''
  );

  return (
    <BillingClient
      invoices={data.invoices}
      llcs={data.llcs}
      userId={session.user.id}
    />
  );
}
