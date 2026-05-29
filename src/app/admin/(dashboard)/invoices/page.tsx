import React from 'react';
import { redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/admin/getAdminUser';
import { getInvoices } from '@/lib/admin/getInvoices';
import { getInvoiceStats } from '@/lib/admin/getInvoiceStats';
import { InvoiceStatsCards } from './_components/InvoiceStatsCards';
import { InvoiceListControls } from './_components/InvoiceListControls';
import { InvoiceTable } from './_components/InvoiceTable';
import { InvoiceEmptyState } from './_components/InvoiceEmptyState';
import { InvoicePagination } from './_components/InvoicePagination';
import { InvoiceCreateButton } from './_components/InvoiceCreateButton';
import { InvoiceFilters } from '@/types/admin';

export const revalidate = 60; // Route segment revalidation config

interface PageProps {
  searchParams: Promise<{
    search?: string;
    dateRange?: string;
    page?: string;
    pageSize?: string;
  }>;
}

export default async function InvoicesPage({ searchParams }: PageProps) {
  // 1. Authenticate & RBAC Check
  const adminUser = await getAdminUser();
  if (!adminUser) {
    redirect('/sign-in?redirect=/admin/invoices' as any);
  }

  // Await searchParams as required by Next.js 15/16
  const resolvedParams = await searchParams;

  const search = resolvedParams.search ? String(resolvedParams.search).trim() : '';

  // Validate date range filter
  let dateRange: 'today' | 'yesterday' | '7d' | '14d' | '30d' | '60d' | '90d' | 'all' = 'all';
  if (
    resolvedParams.dateRange &&
    ['today', 'yesterday', '7', '14', '30', '60', '90', '7d', '14d', '30d', '60d', '90d'].includes(resolvedParams.dateRange)
  ) {
    if (['7', '14', '30', '60', '90'].includes(resolvedParams.dateRange)) {
      dateRange = `${resolvedParams.dateRange}d` as any;
    } else {
      dateRange = resolvedParams.dateRange as any;
    }
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

  const filters: InvoiceFilters = {
    search: search || undefined,
    dateRange: dateRange !== 'all' ? dateRange : undefined,
    page,
    pageSize,
  };

  // 2. Fetch data
  const listResult = await getInvoices(filters);
  const stats = await getInvoiceStats();

  const isFiltered = !!(search || dateRange !== 'all');

  return (
    <div className="space-y-6 font-inter select-text">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900 font-manrope">
            Invoices
          </h1>
          <p className="text-xs font-semibold text-gray-500 font-inter">
            Monitor, create, and manage system invoices, revenues, and commissions.
          </p>
        </div>
        {(adminUser.role === 'administrator' || adminUser.role === 'manager') && (
          <InvoiceCreateButton />
        )}
      </div>

      {/* Stats Cards */}
      <InvoiceStatsCards stats={stats} />

      {/* Controls */}
      <InvoiceListControls filters={filters} />

      {/* Results Count Line */}
      <div className="text-xs font-semibold text-gray-500 font-inter">
        Showing {listResult.invoices.length} of {listResult.total} invoices
      </div>

      {/* Table / Empty State */}
      {listResult.invoices.length > 0 ? (
        <InvoiceTable invoices={listResult.invoices} />
      ) : (
        <InvoiceEmptyState filtered={isFiltered} />
      )}

      {/* Pagination */}
      <InvoicePagination
        totalCount={listResult.total}
        totalPages={listResult.totalPages}
        currentPage={page}
        pageSize={pageSize}
      />
    </div>
  );
}
