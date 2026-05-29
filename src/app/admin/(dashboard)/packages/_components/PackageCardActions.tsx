/**
 * @file src/app/admin/packages/_components/PackageCardActions.tsx
 * @description Client Component containing edit and delete buttons for PackageCard.
 */

'use client';

import React, { useState } from 'react';
import { Package } from '@/types/admin';
import { PackageModal } from './PackageModal';
import { PackageDeleteConfirm } from './PackageDeleteConfirm';

interface PackageCardActionsProps {
  pkg: Package;
}

export function PackageCardActions({ pkg }: PackageCardActionsProps): React.JSX.Element {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-1.5">
        {/* Edit Button */}
        <button
          onClick={() => setEditOpen(true)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-[#f4f0fe] hover:text-[#34088f] transition-colors focus:outline-none"
          title="Edit Package"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
        </button>

        {/* Delete Button */}
        <button
          onClick={() => setDeleteOpen(true)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors focus:outline-none"
          title="Delete Package"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {editOpen && (
        <PackageModal mode="edit" pkg={pkg} onClose={() => setEditOpen(false)} />
      )}

      {deleteOpen && (
        <PackageDeleteConfirm pkg={pkg} onClose={() => setDeleteOpen(false)} />
      )}
    </>
  );
}
