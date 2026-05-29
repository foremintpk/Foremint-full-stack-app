/**
 * @file src/components/admin/AdminBreadcrumb.tsx
 * @description Renders breadcrumb indicators mapped dynamically from active url segments.
 * 
 * 1. Server vs Client choice rationale: Client Component ("use client") to read active pathname parameters.
 * 2. Caching layer: N/A.
 * 3. RBAC: N/A.
 * 4. Revalidation / Cache Busting: N/A.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { useLlcNames } from '@/context/llc-name-context';

export function AdminBreadcrumb() {
 const pathname = usePathname();
 const { llcNames } = useLlcNames();

 // Parse path segments, filtering out empty items
 const segments = pathname.split('/').filter(Boolean);

 const formatSegment = (str: string) => {
   const lower = str.toLowerCase();
   if (llcNames[lower]) {
     return llcNames[lower];
   }
 // Replace hyphens with spaces and capitalize each word
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
 href={"/admin" as any}
 className="hover:text-black font-semibold transition-colors"
 >
 Admin
 </Link>

 {segments.slice(1).map((seg, index, arr) => {
 const url = `/admin/${segments.slice(1, index + 2).join('/')}`;
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
