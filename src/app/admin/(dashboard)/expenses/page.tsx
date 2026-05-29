import React from 'react';
import { redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/admin/getAdminUser';
import { getExpenses } from '@/lib/admin/getExpenses';
import { getExpenseCategories } from '@/lib/admin/getExpenseCategories';
import { getExpenseStats } from '@/lib/admin/getExpenseStats';
import { ExpenseFilters, ExpenseDateRange } from '@/types/admin';

import { ExpenseStatsCards } from './_components/ExpenseStatsCards';
import { ExpenseDateFilter } from './_components/ExpenseDateFilter';
import { ExpenseListControls } from './_components/ExpenseListControls';
import { ExpenseTable } from './_components/ExpenseTable';
import { ExpenseEmptyState } from './_components/ExpenseEmptyState';
import { ExpensePagination } from './_components/ExpensePagination';
import { CategoryManagerButton, ExpenseCreatorButton } from './_components/ExpenseActionButtons';

export const revalidate = 60; // Cache TTL

interface PageProps {
  searchParams: Promise<{
    categoryId?: string;
    dateRange?: string;
    search?: string;
    page?: string;
  }>;
}

export default async function ExpensesPage({ searchParams }: PageProps) {
  // 1. Authenticate
  const adminUser = await getAdminUser();
  if (!adminUser) {
    redirect('/sign-in?redirect=/admin/expenses' as any);
  }

  // Await search params for Next.js 15+ compatibility
  const resolvedParams = await searchParams;

  const pageIndex = parseInt(resolvedParams.page || '1', 10);
  
  const filters: ExpenseFilters = {
    categoryId: resolvedParams.categoryId || 'all',
    dateRange: (resolvedParams.dateRange as ExpenseDateRange) || 'all',
    search: resolvedParams.search || undefined,
    page: pageIndex > 0 ? pageIndex : 1,
    pageSize: 25,
  };

  // 2. Fetch data in parallel
  const [expenseResult, categories, stats] = await Promise.all([
    getExpenses(filters),
    getExpenseCategories(),
    getExpenseStats({ dateRange: filters.dateRange }),
  ]);

  const { expenses, total, totalPages } = expenseResult;

  const isFiltered = !!(filters.categoryId !== 'all' || filters.dateRange !== 'all' || filters.search);

  return (
    <div className="space-y-6 font-inter select-text pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900 font-manrope">
            Expenses
          </h1>
          <p className="text-xs font-semibold text-gray-500 font-inter">
            Track and manage business expenses and categories.
          </p>
        </div>

        {/* Action Buttons */}
        {(adminUser.role === 'administrator' || adminUser.role === 'manager') && (
          <div className="flex items-center gap-3">
            <CategoryManagerButton categories={categories} />
            <ExpenseCreatorButton categories={categories} />
          </div>
        )}
      </div>

      {/* Stats Row */}
      <ExpenseStatsCards stats={stats} />

      {/* Filter Bar */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
        <div className="w-full lg:w-auto overflow-hidden">
          <ExpenseDateFilter activeDateRange={filters.dateRange || 'all'} />
        </div>
        <div className="w-full lg:w-auto shrink-0">
          <ExpenseListControls 
            defaultSearch={filters.search || ''} 
            defaultCategoryId={filters.categoryId || 'all'} 
            categories={categories}
          />
        </div>
      </div>

      {/* Results Count Line */}
      <div className="text-xs font-semibold text-gray-500 font-inter">
        Showing {expenses.length} of {total} expense{total !== 1 && 's'}
      </div>

      {/* Results / Empty State */}
      {expenses.length > 0 ? (
        <>
          <ExpenseTable 
            expenses={expenses} 
            currentAdminRole={adminUser.role} 
            categories={categories} 
          />
          <ExpensePagination 
            currentPage={filters.page || 1} 
            totalPages={totalPages} 
          />
        </>
      ) : (
        <ExpenseEmptyState filtered={isFiltered} />
      )}
    </div>
  );
}
