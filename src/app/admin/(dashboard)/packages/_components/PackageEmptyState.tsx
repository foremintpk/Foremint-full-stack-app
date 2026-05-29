/**
 * @file src/app/admin/packages/_components/PackageEmptyState.tsx
 * @description Renders empty states for packages with different display options.
 */

import React from 'react';

interface PackageEmptyStateProps {
  filtered?: boolean;
}

export function PackageEmptyState({ filtered = false }: PackageEmptyStateProps): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#e0d9f7] bg-white p-12 text-center min-h-[350px]">
      {/* Icon */}
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f4f0fe] text-[#34088f] mb-4">
        <svg
          className="h-8 w-8"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
          />
        </svg>
      </div>

      {/* Copy */}
      <h3 className="text-lg font-bold font-manrope text-gray-900 mb-1">
        {filtered ? 'No packages match this filter' : 'No packages yet'}
      </h3>
      <p className="max-w-sm text-sm text-gray-500">
        {filtered
          ? 'Try selecting a different status tab above to view other packages.'
          : 'Create your first pricing package to get started onboarding LLC clients.'}
      </p>
    </div>
  );
}
