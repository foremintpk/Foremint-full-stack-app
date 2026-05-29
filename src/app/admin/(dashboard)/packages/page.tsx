/**
 * @file src/app/admin/(dashboard)/packages/page.tsx
 * @description Main packages system dashboard page.
 */

import React from 'react';
import { redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/admin/getAdminUser';
import { getPackages } from '@/lib/admin/getPackages';
import { PackageFilterTabs } from './_components/PackageFilterTabs';
import { PackageCreateButton } from './_components/PackageCreateButton';
import { PackageCard } from './_components/PackageCard';
import { PackageEmptyState } from './_components/PackageEmptyState';

export const revalidate = 600;

interface PageProps {
  searchParams: Promise<{
    status?: string;
  }>;
}

export default async function PackagesPage({ searchParams }: PageProps) {
  // 1. Authenticate & RBAC Check
  const adminUser = await getAdminUser();
  if (!adminUser) {
    redirect('/sign-in?redirect=/admin/packages' as any);
  }

  // Await searchParams as required by Next.js 15/16
  const resolvedParams = await searchParams;
  const activeStatus = resolvedParams.status || 'all';

  // 2. Fetch all packages once
  const allPackages = await getPackages('all');

  // 3. Compute counts from the single result
  const counts = {
    all: allPackages.length,
    published: allPackages.filter((pkg) => pkg.status === 'published').length,
    draft: allPackages.filter((pkg) => pkg.status === 'draft').length,
  };

  // 4. Filter the displayed array server-side based on status
  const displayedPackages = allPackages.filter((pkg) => {
    if (activeStatus === 'all') return true;
    return pkg.status === activeStatus;
  });

  return (
    <div className="space-y-6 font-inter select-text">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-gray-900 font-manrope">
            Packages Configuration
          </h1>
          <p className="text-xs font-semibold text-gray-500 font-inter">
            Manage onboarding packages, pricing, and features.
          </p>
        </div>
        <div>
          <PackageCreateButton />
        </div>
      </div>

      {/* Filter Tabs */}
      <PackageFilterTabs counts={counts} activeStatus={activeStatus} />

      {/* Packages Grid or Empty State */}
      {displayedPackages.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedPackages.map((pkg) => (
            <PackageCard key={pkg.id} pkg={pkg} />
          ))}
        </div>
      ) : (
        <PackageEmptyState filtered={activeStatus !== 'all'} />
      )}
    </div>
  );
}
