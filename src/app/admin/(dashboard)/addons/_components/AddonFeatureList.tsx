import React from 'react';

interface AddonFeatureListProps {
  features: string[];
}

export function AddonFeatureList({ features }: AddonFeatureListProps) {
  if (!features || features.length === 0) return null;

  return (
    <div className="space-y-2.5 font-inter">
      {features.map((feature, idx) => (
        <div key={idx} className="flex items-start gap-2.5">
          <div className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-[#34088f]" />
          <span className="text-sm text-gray-600 leading-snug break-words">
            {feature}
          </span>
        </div>
      ))}
    </div>
  );
}
