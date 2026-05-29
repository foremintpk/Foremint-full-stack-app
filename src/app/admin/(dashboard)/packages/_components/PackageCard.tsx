/**
 * @file src/app/admin/packages/_components/PackageCard.tsx
 * @description Server Component representing a single package card.
 */

import React from 'react';
import { Package } from '@/types/admin';
import { PackageStatusBadge } from './PackageStatusBadge';
import { PackageFeatureList } from './PackageFeatureList';
import { PackageCardActions } from './PackageCardActions';
import { formatPKR } from '@/lib/admin/formatters';

interface PackageCardProps {
  pkg: Package;
}

export function PackageCard({ pkg }: PackageCardProps): React.JSX.Element {
  return (
    <div className="rounded-2xl border border-[#e0d9f7] bg-white p-6 shadow-[0_1px_4px_rgba(52,8,143,0.06)] hover:shadow-[0_6px_20px_rgba(52,8,143,0.1)] transition-shadow duration-200 flex flex-col justify-between h-full">
      <div>
        {/* Top Header Row */}
        <div className="flex items-center justify-between mb-4">
          <PackageStatusBadge status={pkg.status} />
          <PackageCardActions pkg={pkg} />
        </div>

        {/* Package Title & Price */}
        <div className="mb-5">
          <h4 className="text-lg font-bold font-manrope text-gray-900 mb-1 tracking-tight truncate" title={pkg.name}>
            {pkg.name}
          </h4>
          <span className="text-2xl font-extrabold font-manrope text-[#34088f]">
            {formatPKR(pkg.price)}
          </span>
        </div>

        {/* Divider */}
        <hr className="border-t border-[#e0d9f7] mb-5" />

        {/* Features list */}
        <PackageFeatureList features={pkg.features} maxVisible={5} />
      </div>

      {/* Optional: Sort order helper inside cards */}
      <div className="mt-6 flex items-center justify-between text-[10px] text-gray-400">
        <span>Order: {pkg.sortOrder}</span>
        <span>Last updated: {new Date(pkg.updatedAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
