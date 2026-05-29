/**
 * @file src/components/admin/SidebarBadge.tsx
 * @description Renders a premium notifications or registrations badge indicator.
 * 
 * 1. Server vs Client choice rationale: Server Component (lightweight visual presenter).
 * 2. Caching layer: N/A.
 * 3. RBAC: N/A.
 * 4. Revalidation / Cache Busting: N/A.
 */

import React from 'react';

interface SidebarBadgeProps {
  count: number;
}

export function SidebarBadge({ count }: SidebarBadgeProps) {
  if (count <= 0) return null;

  return (
    <span
      className="ml-auto inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-black leading-none text-white bg-[#ef4444] rounded-full min-w-[18px] animate-pulse"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
