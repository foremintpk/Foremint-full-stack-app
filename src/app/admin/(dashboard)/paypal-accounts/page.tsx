import React from 'react';
import { redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/admin/getAdminUser';
import { getPaypalOrders } from '@/lib/admin/getPaypalOrders';
import { getPaypalOrderStats } from '@/lib/admin/getPaypalOrderStats';
import { PaypalOrderStatsCards } from './_components/PaypalOrderStatsCards';
import { PaypalOrderListControls } from './_components/PaypalOrderListControls';
import { PaypalOrderTable } from './_components/PaypalOrderTable';
import { PaypalOrderEmptyState } from './_components/PaypalOrderEmptyState';
import { PaypalOrderPagination } from './_components/PaypalOrderPagination';
import { PaypalOrderCreateButton } from './_components/PaypalOrderCreateButton';
import { PaypalOrderFilters, PaypalOrderStatus, PaypalOrderType } from '@/types/admin';

export const revalidate = 60; // Route segment revalidation config

interface PageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    type?: string;
    dateRange?: string;
    page?: string;
    pageSize?: string;
  }>;
}

export default async function PaypalAccountsPage({ searchParams }: PageProps) {
  // 1. Authenticate & RBAC Check
  const adminUser = await getAdminUser();
  if (!adminUser) {
    redirect('/sign-in?redirect=/admin/paypal-accounts' as any);
  }

  // Await searchParams as required by Next.js 15/16
  const resolvedParams = await searchParams;

  const search = resolvedParams.search ? String(resolvedParams.search).trim() : '';

  // Validate status filter
  let status: PaypalOrderStatus | 'all' = 'all';
  if (
    resolvedParams.status &&
    ['pending', 'completed', 'suspended', 'failed'].includes(resolvedParams.status)
  ) {
    status = resolvedParams.status as PaypalOrderStatus;
  }

  // Validate type filter
  let type: PaypalOrderType | 'all' = 'all';
  if (
    resolvedParams.type &&
    ['new', 'replacement'].includes(resolvedParams.type)
  ) {
    type = resolvedParams.type as PaypalOrderType;
  }

  // Validate date range filter
  let dateRange: '7d' | '14d' | '30d' | '60d' | '90d' | 'all' = 'all';
  if (
    resolvedParams.dateRange &&
    ['7', '14', '30', '60', '90'].includes(resolvedParams.dateRange)
  ) {
    dateRange = `${resolvedParams.dateRange}d` as any;
  }

  // Validate page
  let page = 1;
  const parsedPage = parseInt(resolvedParams.page || '1', 10);
  if (!isNaN(parsedPage) && parsedPage > 0) {
    page = parsedPage;
  }

  // Validate page size
  let pageSize = 25;
  const parsedPageSize = parseInt(resolvedParams.pageSize || '25', 10);
  if (!isNaN(parsedPageSize) && parsedPageSize > 0) {
    pageSize = parsedPageSize;
  }

  const filters: PaypalOrderFilters = {
    search: search || undefined,
    status: status !== 'all' ? status : undefined,
    type: type !== 'all' ? type : undefined,
    dateRange: dateRange !== 'all' ? dateRange : undefined,
    page,
    pageSize,
  };

  // 2. Fetch list and stats
  const listResult = await getPaypalOrders(filters);
  const stats = await getPaypalOrderStats();

  const isFiltered = !!(search || status !== 'all' || type !== 'all' || dateRange !== 'all');

  return (
    <div className="space-y-6 font-inter select-text">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900 font-manrope">
            PayPal Accounts
          </h1>
          <p className="text-xs font-semibold text-gray-500 font-inter">
            Monitor, log, and manage separate PayPal billing and replacement orders.
          </p>
        </div>
        {(adminUser.role === 'administrator' || adminUser.role === 'manager') && (
          <PaypalOrderCreateButton />
        )}
      </div>

      {/* Stats Cards */}
      <PaypalOrderStatsCards stats={stats} />

      {/* Controls */}
      <PaypalOrderListControls filters={filters} />

      {/* Results Count Line */}
      <div className="text-xs font-semibold text-gray-500 font-inter">
        Showing {listResult.orders.length} of {listResult.total} orders
      </div>

      {/* Table / Cards or Empty State */}
      {listResult.orders.length > 0 ? (
        <PaypalOrderTable orders={listResult.orders} />
      ) : (
        <PaypalOrderEmptyState filtered={isFiltered} />
      )}

      {/* Pagination */}
      <PaypalOrderPagination
        totalCount={listResult.total}
        totalPages={listResult.totalPages}
        currentPage={page}
        pageSize={pageSize}
      />
    </div>
  );
}
