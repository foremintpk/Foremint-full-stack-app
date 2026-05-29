/**
 * @file src/app/admin/(dashboard)/llc-registrations/[orderId]/page.tsx
 * @description LLC Order Registration Detail server component page.
 * Forces dynamic loading to guarantee always-fresh role authorization and views synchronization.
 */

import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/admin/getAdminUser';
import { getOrderDetail } from '@/lib/admin/getOrderDetail';
import { getOrderInternalData } from '@/lib/admin/getOrderInternalData';
import { getPackages } from '@/lib/admin/getPackages';
import { getAddons } from '@/lib/admin/getAddons';

import { OrderDetailHeader } from './_components/OrderDetailHeader';
import { MarkAsViewedTrigger } from './_components/MarkAsViewedTrigger';
import { CustomerInfoAccordion } from './_components/CustomerInfoAccordion';
import { InternalOperationsAccordion } from './_components/internal-operations/InternalOperationsAccordion';
import { RegisterLlcName } from './_components/RegisterLlcName';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ orderId: string }> | { orderId: string };
}

export default async function OrderDetailPage({ params }: PageProps) {
  // 1. Resolve params (Next.js 15 dynamic params standard)
  const resolvedParams = await params;
  const orderId = resolvedParams.orderId;

  // 2. Fetch authenticated admin profile (redirect to /login if unauthenticated/unauthorized)
  const adminUser = await getAdminUser();
  if (!adminUser) {
    redirect('/login');
  }

  // 3. Fetch full order detail with cached fetcher (validates UUID internally)
  const order = await getOrderDetail(orderId);
  if (!order) {
    notFound();
  }

  // Fetch internal operations data securely for administrator/manager roles
  const internalData = await getOrderInternalData(order.id);

  // Fetch packages and addons dynamically
  const [packages, addons] = await Promise.all([
    getPackages('all'),
    getAddons({}),
  ]);

  // 4. Check if order is unread/new for this admin
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  const { data: viewRow } = await supabase
    .from('admin_order_views')
    .select('id')
    .eq('admin_id', adminUser.id)
    .eq('order_id', order.id)
    .maybeSingle();
  const isNew = !viewRow;

  // 5. Verify order type is LLC (PayPal orders go to paypal-registrations)
  // Wait, let's look at order_type in DB. It is a string which we check to be 'llc'
  // If undefined/null or not 'llc', redirect to list
  if (order.formSnapshot?.order_type && order.formSnapshot.order_type !== 'llc') {
    redirect('/admin/llc-registrations');
  }

  return (
    <div className="w-full space-y-6 pb-12">
      <RegisterLlcName id={order.id} name={order.llcName} />
      {/* Header section with status dropdown controls */}
      <OrderDetailHeader order={order} adminId={adminUser.id} isNew={isNew} />

      {/* Trigger to silently mark the order viewed on mount (does not block loading) */}
      <MarkAsViewedTrigger orderId={order.id} adminId={adminUser.id} />

      {/* Accordion Panels Stack */}
      <div className="space-y-6">
        {/* Customer Information accordion section */}
        <CustomerInfoAccordion
          order={order}
          adminId={adminUser.id}
          allPackages={packages}
          allAddons={addons}
        />

        {/* Internal Operations accordion section */}
        <InternalOperationsAccordion
          orderId={order.id}
          adminId={adminUser.id}
          initialData={internalData}
        />
      </div>
    </div>
  );
}

