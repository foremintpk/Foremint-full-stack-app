/**
 * @file src/app/admin/(dashboard)/llc-registrations/page.tsx
 * @description Operational LLC Registrations list page. Resolves admin session, sanitizes all filter/search/sort URL query parameters, and fires parallel database analytics and listing queries.
 */

import React from 'react';
import { redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/admin/getAdminUser';
import { getLlcOrders } from '@/lib/admin/getLlcOrders';
import { getLlcOrderStats } from '@/lib/admin/getLlcOrderStats';

import LlcListTopStats from './_components/LlcListTopStats';
import LlcListControls from './_components/LlcListControls';
import LlcOrderTable from './_components/LlcOrderTable';
import LlcEmptyState from './_components/LlcEmptyState';
import LlcPagination from './_components/LlcPagination';
import LlcContentArea from './_components/LlcContentArea';
import { LlcNavigationProvider } from '@/context/llc-navigation-context';
import { LlcListFilters, LlcOrderStatus, DateRangeFilter, LlcSortField, SortDirection } from '@/types/admin';

export const revalidate = 60; // Cache listings at route level for up to 60s

interface PageProps {
 searchParams: Promise<{
 q?: string;
 status?: string;
 filter?: string;
 page?: string;
 pageSize?: string;
 sort?: string;
 dir?: string;
 }>;
}

export default async function LlcRegistrationsPage({ searchParams }: PageProps) {
 // 1. Strict Security Authentication & RBAC Check
 const adminUser = await getAdminUser();
 if (!adminUser) {
 redirect('/sign-in?redirect=/admin/llc-registrations' as any);
 }

 // 2. Parse and sanitize searchParams with strict type checking & default fallbacks
 const resolvedParams = await searchParams;

 const rawQ = resolvedParams.q ? String(resolvedParams.q).trim() : '';

 // Validate LLC Status
 let status: LlcOrderStatus | 'all' = 'all';
 if (
 resolvedParams.status &&
 ['pending', 'initialized', 'submitted_in_state', 'ein_pending', 'formed', 'cancelled'].includes(resolvedParams.status)
 ) {
 status = resolvedParams.status as LlcOrderStatus;
 }

 // Validate Date range filter
 let dateFilter: DateRangeFilter | 'all' = 'all';
 if (
 resolvedParams.filter &&
 ['today', 'yesterday', '7d', '14d', '30d', '60d', '90d'].includes(resolvedParams.filter)
 ) {
 dateFilter = resolvedParams.filter as DateRangeFilter;
 }

 // Validate Page Number
 let page = 1;
 const parsedPage = parseInt(resolvedParams.page || '1', 10);
 if (!isNaN(parsedPage) && parsedPage > 0) {
 page = parsedPage;
 }

 // Validate Page Size
 let pageSize: 10 | 25 | 50 = 25;
 const parsedPageSize = parseInt(resolvedParams.pageSize || '25', 10);
 if ([10, 25, 50].includes(parsedPageSize)) {
 pageSize = parsedPageSize as 10 | 25 | 50;
 }

 // Validate Sort Field
 let sort: LlcSortField = 'created_at';
 if (
 resolvedParams.sort &&
 ['created_at', 'order_number', 'grand_total'].includes(resolvedParams.sort)
 ) {
 sort = resolvedParams.sort as LlcSortField;
 }

 // Validate Sort Direction
 let dir: SortDirection = 'desc';
 if (resolvedParams.dir && ['asc', 'desc'].includes(resolvedParams.dir)) {
 dir = resolvedParams.dir as SortDirection;
 }

 const filters: LlcListFilters = {
 q: rawQ,
 status,
 dateFilter,
 page,
 pageSize,
 sort,
 dir,
 };

 // 3. Parallel fetch utilizing Promise.all for lists & status stats
 const [listResult, stats] = await Promise.all([
 getLlcOrders(filters, adminUser.id),
 getLlcOrderStats(dateFilter),
 ]);

  return (
    <LlcNavigationProvider>
      <div className="space-y-6 font-inter">
        {/* Title & Subtitle */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-black font-manrope">LLC Registrations</h1>
          <p className="text-xs font-semibold text-gray-500 font-inter">
            {stats.total} total orders
          </p>
        </div>

        {/* Status filter pills — All / Pending / Processing / Formed */}
        <LlcListTopStats stats={stats} activeStatus={status} filters={filters} />

        {/* Search, date filter, sort, page-size controls */}
        <LlcListControls filters={filters} />

        {/* Table + pagination wrapped in the loading overlay */}
        <LlcContentArea>
          {listResult.orders.length > 0 ? (
            <LlcOrderTable orders={listResult.orders} />
          ) : (
            <LlcEmptyState filters={filters} isTotalZero={stats.total === 0} />
          )}

          <LlcPagination
            totalCount={listResult.totalCount}
            totalPages={listResult.totalPages}
            currentPage={filters.page}
            pageSize={filters.pageSize}
          />
        </LlcContentArea>
      </div>
    </LlcNavigationProvider>
  );
}
