/**
 * @file src/app/admin/packages/_components/PackageStatusBadge.tsx
 * @description Renders a status badge for a package (Draft vs Published).
 */

import React from 'react';
import { PackageStatus } from '@/types/admin';

interface PackageStatusBadgeProps {
  status: PackageStatus;
}

export function PackageStatusBadge({ status }: PackageStatusBadgeProps): React.JSX.Element {
  const isPublished = status === 'published';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border ${
        isPublished
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-amber-50 text-amber-700 border-amber-200'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isPublished ? 'bg-emerald-500' : 'bg-amber-500'
        }`}
      />
      {isPublished ? 'Published' : 'Draft'}
    </span>
  );
}
