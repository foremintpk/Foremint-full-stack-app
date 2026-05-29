import React from 'react';
import { redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/admin/getAdminUser';
import { getAddons } from '@/lib/admin/getAddons';
import { getAddonCategories } from '@/lib/admin/getAddonCategories';
import { AddonFilters, AddonStatus } from '@/types/admin';

import { AddonCategoryTabs } from './_components/AddonCategoryTabs';
import { AddonListControls } from './_components/AddonListControls';
import { AddonCardGrid } from './_components/AddonCardGrid';
import { AddonEmptyState } from './_components/AddonEmptyState';
import { CategoryManagerButton, AddonCreatorButton } from './_components/AddonActionButtons';

export const revalidate = 120; // Cache TTL

interface PageProps {
  searchParams: Promise<{
    categoryId?: string;
    status?: string;
    search?: string;
  }>;
}

export default async function AddonsPage({ searchParams }: PageProps) {
  // 1. Authenticate
  const adminUser = await getAdminUser();
  if (!adminUser) {
    redirect('/sign-in?redirect=/admin/addons' as any);
  }

  // Await search params for Next.js 15+ compatibility
  const resolvedParams = await searchParams;

  const filters: AddonFilters = {
    categoryId: resolvedParams.categoryId || 'all',
    status: (resolvedParams.status as AddonStatus | 'all') || 'all',
    search: resolvedParams.search || undefined,
  };

  // 2. Fetch data in parallel
  const [addons, categories] = await Promise.all([
    getAddons(filters),
    getAddonCategories(),
  ]);

  const isFiltered = !!(filters.categoryId !== 'all' || filters.status !== 'all' || filters.search);

  return (
    <div className="space-y-6 font-inter select-text pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900 font-manrope">
            Addons
          </h1>
          <p className="text-xs font-semibold text-gray-500 font-inter">
            Configure system-wide add-ons and categorize them.
          </p>
        </div>

        {/* Action Buttons */}
        {(adminUser.role === 'administrator' || adminUser.role === 'manager') && (
          <div className="flex items-center gap-3">
            <CategoryManagerButton categories={categories} />
            <AddonCreatorButton categories={categories} />
          </div>
        )}
      </div>

      {/* Top Filter Bar */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
        <div className="w-full lg:w-auto overflow-hidden">
          <AddonCategoryTabs 
            categories={categories} 
            activeCategoryId={filters.categoryId || 'all'} 
          />
        </div>
        <div className="w-full lg:w-auto shrink-0">
          <AddonListControls 
            defaultSearch={filters.search || ''} 
            defaultStatus={filters.status || 'all'} 
          />
        </div>
      </div>

      {/* Results Count Line */}
      <div className="text-xs font-semibold text-gray-500 font-inter">
        Showing {addons.length} addon{addons.length !== 1 && 's'}
      </div>

      {/* Results / Empty State */}
      {addons.length > 0 ? (
        <AddonCardGrid addons={addons} categories={categories} />
      ) : (
        <AddonEmptyState filtered={isFiltered} />
      )}
    </div>
  );
}
