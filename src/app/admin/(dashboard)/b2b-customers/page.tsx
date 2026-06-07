/**
 * @file src/app/admin/(dashboard)/b2b-customers/page.tsx
 * @description B2B Customers management — create B2B accounts and assign read-only
 * LLC orders to them. Administrator-only.
 */

import React from 'react';
import { redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/admin/getAdminUser';
import { getB2BCustomers } from '@/lib/admin/getB2BCustomers';
import { getAssignableOrders } from '@/lib/admin/getAssignableOrders';
import { B2BCustomersClient } from './_components/B2BCustomersClient';

export const dynamic = 'force-dynamic';

export default async function B2BCustomersPage() {
  const adminUser = await getAdminUser();
  if (!adminUser) {
    redirect('/sign-in?redirect=/admin/b2b-customers' as any);
  }

  // Only administrators can manage B2B customers (mirrors user management).
  const isAdministrator = adminUser.role === 'administrator';

  const [customers, orders] = await Promise.all([
    getB2BCustomers(),
    getAssignableOrders(),
  ]);

  return (
    <div className="space-y-6 font-inter select-text">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900 font-manrope">B2B Customers</h1>
          <p className="text-xs font-semibold text-gray-500 font-inter">
            Create B2B accounts and assign read-only LLC orders they can view in their dashboard.
          </p>
        </div>
      </div>

      <B2BCustomersClient
        customers={customers}
        orders={orders}
        canManage={isAdministrator}
      />
    </div>
  );
}
