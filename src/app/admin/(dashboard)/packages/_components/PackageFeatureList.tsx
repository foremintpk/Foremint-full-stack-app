/**
 * @file src/app/admin/packages/_components/PackageFeatureList.tsx
 * @description Renders the feature list with visual indicators and overflow labels.
 */

import React from 'react';

interface PackageFeatureListProps {
  features: string[];
  maxVisible?: number;
}

export function PackageFeatureList({
  features,
  maxVisible = 5,
}: PackageFeatureListProps): React.JSX.Element {
  const visibleFeatures = features.slice(0, maxVisible);
  const overflowCount = features.length - maxVisible;

  return (
    <div className="flex flex-col gap-2.5">
      <ul className="space-y-2.5">
        {visibleFeatures.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-3 text-sm text-gray-600">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#f4f0fe] text-[#34088f]">
              <svg
                className="h-3 w-3"
                xmlns="http://www.w3.org/0000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <span className="break-words">{feature}</span>
          </li>
        ))}
      </ul>
      {overflowCount > 0 && (
        <span className="text-xs font-medium text-gray-400 pl-8">
          + {overflowCount} more {overflowCount === 1 ? 'feature' : 'features'}
        </span>
      )}
    </div>
  );
}
