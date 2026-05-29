'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { useLlcNames } from '@/context/llc-name-context';

export function CustomerBreadcrumb() {
  const pathname = usePathname();
  const { llcNames } = useLlcNames();

  const segments = pathname.split('/').filter(Boolean);

  const formatSegment = (str: string) => {
    const lower = str.toLowerCase();
    if (llcNames[lower]) {
      return llcNames[lower];
    }
    return str
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1.5 text-xs text-gray-500 font-inter"
    >
      <Link
        href={"/dashboard" as any}
        className="hover:text-black font-semibold transition-colors"
      >
        Dashboard
      </Link>

      {segments.slice(1).map((seg, index, arr) => {
        const url = `/dashboard/${segments.slice(1, index + 2).join('/')}`;
        const isLast = index === arr.length - 1;

        return (
          <React.Fragment key={url}>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            {isLast ? (
              <span className="text-black font-bold truncate">
                {formatSegment(seg)}
              </span>
            ) : (
              <Link
                href={url as any}
                className="hover:text-black font-semibold transition-colors truncate"
              >
                {formatSegment(seg)}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
