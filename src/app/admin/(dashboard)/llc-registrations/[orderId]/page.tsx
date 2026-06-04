import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/admin/getAdminUser';
import { getOrderDetail } from '@/lib/admin/getOrderDetail';
import { getOrderInternalData } from '@/lib/admin/getOrderInternalData';
import { getPackages } from '@/lib/admin/getPackages';
import { getAddons } from '@/lib/admin/getAddons';
import { getOrderBillingEntries } from '@/lib/admin/actions/addBillingEntry';
import { getOrderClientNotifications } from '@/lib/admin/actions/manageClientNotifications';
import { getOrderTickets } from '@/lib/admin/actions/manageTickets';
import { OrderDetailTabsClient } from './_components/OrderDetailTabsClient';
import { MarkAsViewedTrigger } from './_components/MarkAsViewedTrigger';
import { RegisterLlcName } from './_components/RegisterLlcName';
import type { AdminRole } from '@/types/admin';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ orderId: string }> | { orderId: string };
}

export default async function OrderDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const orderId = resolvedParams.orderId;

  const adminUser = await getAdminUser();
  if (!adminUser) redirect('/login');

  const order = await getOrderDetail(orderId);
  if (!order) notFound();

  const [internalData, packages, addons, billingEntries, notifications, tickets] =
    await Promise.all([
      getOrderInternalData(order.id),
      getPackages('all'),
      getAddons({}),
      getOrderBillingEntries(order.id),
      getOrderClientNotifications(order.id),
      getOrderTickets(order.id),
    ]);

  return (
    <div className="w-full pb-12">
      <RegisterLlcName id={order.id} name={order.llcName} />
      <MarkAsViewedTrigger orderId={order.id} adminId={adminUser.id} />
      <OrderDetailTabsClient
        order={order}
        internalData={internalData}
        packages={packages}
        allAddons={addons}
        adminId={adminUser.id}
        adminRole={adminUser.role as AdminRole}
        billingEntries={billingEntries}
        notifications={notifications}
        tickets={tickets}
      />
    </div>
  );
}
