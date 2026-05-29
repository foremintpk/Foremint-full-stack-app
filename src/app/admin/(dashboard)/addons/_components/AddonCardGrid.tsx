import React from 'react';
import { Addon, AddonCategory } from '@/types/admin';
import { AddonCard } from './AddonCard';

interface AddonCardGridProps {
  addons: Addon[];
  categories: AddonCategory[];
}

export function AddonCardGrid({ addons, categories }: AddonCardGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {addons.map(addon => (
        <AddonCard key={addon.id} addon={addon} categories={categories} />
      ))}
    </div>
  );
}
