import React from 'react';
import { Addon, AddonCategory } from '@/types/admin';
import { AddonStatusBadge } from './AddonStatusBadge';
import { AddonFeatureList } from './AddonFeatureList';
import { AddonCardActions } from './AddonCardActions';

interface AddonCardProps {
  addon: Addon;
  categories: AddonCategory[];
}

export function AddonCard({ addon, categories }: AddonCardProps) {
  const formattedPrice = `$${addon.price.toFixed(2)}`;

  return (
    <div className="flex flex-col rounded-2xl border border-[#e0d9f7] bg-white p-5 shadow-[0_1px_4px_rgba(52,8,143,0.06)] hover:shadow-[0_6px_20px_rgba(52,8,143,0.1)] transition-shadow duration-200">
      
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex flex-col gap-1.5 items-start">
          <h3 className="text-base font-semibold font-manrope text-gray-900 leading-tight">
            {addon.name}
          </h3>
          <AddonStatusBadge status={addon.status} />
        </div>
        <div className="shrink-0">
          <AddonCardActions addonId={addon.id} addon={addon} categories={categories} />
        </div>
      </div>

      {/* Price row */}
      <div className="mb-4">
        <span className="text-2xl font-bold text-[#34088f] font-manrope">
          {formattedPrice}
        </span>
      </div>

      {/* Categories */}
      {addon.categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {addon.categories.map(cat => (
            <span
              key={cat.id}
              className="rounded-full bg-[#f4f0fe] text-[#34088f] text-xs px-2.5 py-0.5 font-medium border border-[#e0d9f7]/50"
            >
              {cat.name}
            </span>
          ))}
        </div>
      )}

      {/* Features */}
      <div className="flex-1 mb-5">
        <AddonFeatureList features={addon.features} />
      </div>

      {/* Bottom */}
      <div className="mt-auto pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-400 font-inter">
          Created {new Date(addon.createdAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
