import React from 'react';
import { AddonStatus } from '@/types/admin';

interface AddonStatusBadgeProps {
  status: AddonStatus;
}

export function AddonStatusBadge({ status }: AddonStatusBadgeProps) {
  const isPublished = status === 'published';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider border ${
        isPublished
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-amber-50 text-amber-700 border-amber-200'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isPublished ? 'bg-emerald-500' : 'bg-amber-500'
        }`}
      />
      {status}
    </span>
  );
}
