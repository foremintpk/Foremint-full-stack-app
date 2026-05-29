/**
 * @file src/app/admin/(dashboard)/users/_components/UserStatusBadge.tsx
 * @description Server Component for rendering user active/inactive status badges with colored indicators.
 */

import React from 'react';

interface UserStatusBadgeProps {
  isActive: boolean;
}

export function UserStatusBadge({ isActive }: UserStatusBadgeProps): React.JSX.Element {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border select-text ${
        isActive
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-red-50 text-red-600 border-red-200'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isActive ? 'bg-emerald-500' : 'bg-red-500'
        }`}
      />
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}
export default UserStatusBadge;
