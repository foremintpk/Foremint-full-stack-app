import React from 'react';
import { Puzzle } from 'lucide-react';

interface AddonEmptyStateProps {
  filtered?: boolean;
}

export function AddonEmptyState({ filtered = false }: AddonEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#e0d9f7] bg-white p-12 text-center shadow-[0_1px_4px_rgba(52,8,143,0.06)] font-inter select-text">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f4f0fe] text-[#34088f] mb-4">
        <Puzzle className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 font-manrope">
        {filtered ? 'No addons match your filters' : 'No addons yet'}
      </h3>
      <p className="mt-1 text-sm text-gray-500 font-inter">
        {filtered
          ? 'Try adjusting your search query or category filters.'
          : 'Create your first addon to get started.'}
      </p>
    </div>
  );
}
