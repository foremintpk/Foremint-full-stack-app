/**
 * @file src/app/admin/(dashboard)/users/_components/UserRoleBadge.tsx
 * @description Server Component for rendering styled role badges.
 */

import React from 'react';
import { UserRole } from '@/types/admin';

interface UserRoleBadgeProps {
  role: UserRole;
}

export function UserRoleBadge({ role }: UserRoleBadgeProps): React.JSX.Element {
  const styles = {
    administrator: 'bg-[#f4f0fe] text-[#34088f] border-[#e0d9f7]',
    manager: 'bg-blue-50 text-blue-700 border-blue-200',
    customer: 'bg-gray-50 text-gray-600 border-gray-200',
  };

  const currentStyle = styles[role] || styles.customer;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize select-text ${currentStyle}`}
    >
      {role}
    </span>
  );
}
export default UserRoleBadge;
