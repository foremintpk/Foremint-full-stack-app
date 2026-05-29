/**
 * @file src/app/admin/(dashboard)/users/page.tsx
 * @description Users Management system dashboard page.
 */

import React from 'react';
import { redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/admin/getAdminUser';
import { getUsers } from '@/lib/admin/getUsers';
import { UserListControls } from './_components/UserListControls';
import { UserCreateButton } from './_components/UserCreateButton';
import { UserTable } from './_components/UserTable';
import { UserEmptyState } from './_components/UserEmptyState';
import { UserPagination } from './_components/UserPagination';
import { UserListFilters, UserRole } from '@/types/admin';

export const revalidate = 120; // Cache listings at route level for up to 120s

interface PageProps {
  searchParams: Promise<{
    search?: string;
    role?: string;
    status?: string;
    page?: string;
    pageSize?: string;
  }>;
}

export default async function UsersPage({ searchParams }: PageProps) {
  // 1. Authenticate & RBAC Check
  const adminUser = await getAdminUser();
  if (!adminUser) {
    redirect('/sign-in?redirect=/admin/users' as any);
  }

  // Await searchParams as required by Next.js 15/16
  const resolvedParams = await searchParams;

  const search = resolvedParams.search ? String(resolvedParams.search).trim() : '';

  // Validate Role filter
  let role: UserRole | 'all' = 'all';
  if (
    resolvedParams.role &&
    ['administrator', 'manager', 'customer'].includes(resolvedParams.role)
  ) {
    role = resolvedParams.role as UserRole;
  }

  // Validate Status filter
  let status: 'active' | 'inactive' | 'all' = 'all';
  if (
    resolvedParams.status &&
    ['active', 'inactive'].includes(resolvedParams.status)
  ) {
    status = resolvedParams.status as 'active' | 'inactive';
  }

  // Validate Page Number
  let page = 1;
  const parsedPage = parseInt(resolvedParams.page || '1', 10);
  if (!isNaN(parsedPage) && parsedPage > 0) {
    page = parsedPage;
  }

  // Validate Page Size
  let pageSize = 25;
  const parsedPageSize = parseInt(resolvedParams.pageSize || '25', 10);
  if (!isNaN(parsedPageSize) && parsedPageSize > 0) {
    pageSize = parsedPageSize;
  }

  const filters: UserListFilters = {
    search: search || undefined,
    role: role !== 'all' ? role : undefined,
    status: status !== 'all' ? status : undefined,
    page,
    pageSize,
  };

  // 2. Fetch list
  const listResult = await getUsers(filters);

  // Determine if filters are applied
  const isFiltered = !!(search || role !== 'all' || status !== 'all');

  return (
    <div className="space-y-6 font-inter select-text">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900 font-manrope">
            Users
          </h1>
          <p className="text-xs font-semibold text-gray-500 font-inter">
            Manage Foremint user credentials, system roles, and status.
          </p>
        </div>
        {adminUser.role === 'administrator' && (
          <UserCreateButton />
        )}
      </div>

      {/* Controls (Search, Status Filter, Page Size) */}
      <UserListControls filters={filters} />

      {/* Results Count Line */}
      <div className="text-xs font-semibold text-gray-500 font-inter">
        Showing {listResult.users.length} of {listResult.total} users
      </div>

      {/* Users table or empty state */}
      {listResult.users.length > 0 ? (
        <UserTable users={listResult.users} />
      ) : (
        <UserEmptyState filtered={isFiltered} />
      )}

      {/* Pagination Coordinator */}
      <UserPagination
        totalCount={listResult.total}
        totalPages={listResult.totalPages}
        currentPage={page}
        pageSize={pageSize}
      />
    </div>
  );
}
