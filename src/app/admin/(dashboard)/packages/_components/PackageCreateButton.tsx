/**
 * @file src/app/admin/packages/_components/PackageCreateButton.tsx
 * @description Client Component button to launch the create package modal.
 */

'use client';

import React, { useState } from 'react';
import { PackageModal } from './PackageModal';

export function PackageCreateButton(): React.JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full bg-[#34088f] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#34088f]/90 transition-colors focus:outline-none focus:ring-2 focus:ring-[#34088f]/20"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M12 4v16m8-8H4"
          />
        </svg>
        New Package
      </button>

      {open && (
        <PackageModal mode="create" onClose={() => setOpen(false)} />
      )}
    </>
  );
}
