/**
 * @file src/app/admin/(dashboard)/users/_components/UserRow.tsx
 * @description Server Component representing a single row in the desktop users table.
 */

import React from 'react';
import { AdminUser, UserRole } from '@/types/admin';
import { UserRoleBadge } from './UserRoleBadge';
import { UserStatusBadge } from './UserStatusBadge';
import { UserActionMenu } from './UserActionMenu';
import { formatDate } from '@/lib/admin/formatters';

interface UserRowProps {
  user: AdminUser;
  currentAdminRole: UserRole;
  currentAdminId: string;
}

export function UserRow({
  user,
  currentAdminRole,
  currentAdminId,
}: UserRowProps): React.JSX.Element {
  const initials = (user.fullName || user.email)
    .substring(0, 2)
    .toUpperCase();

  return (
    <div
      role="row"
      className="grid grid-cols-[1.5fr_1fr_1fr_0.8fr_1fr_0.8fr] gap-0 px-6 py-4 bg-white border-b border-[#e0d9f7] hover:bg-gray-50/50 transition-all duration-150 items-center select-text"
    >
      {/* Col 1: Name/Email */}
      <div role="cell" className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#f4f0fe] text-[#34088f] flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden select-none border border-[#e0d9f7]">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.fullName || 'User'} className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate font-manrope">
            {user.fullName || 'No Name Set'}
          </p>
          <p className="text-xs text-gray-500 truncate select-all">
            {user.email}
          </p>
        </div>
      </div>

      {/* Col 2: Phone */}
      <div role="cell" className="text-sm text-gray-950 truncate select-all pr-2">
        {user.phone || <span className="text-gray-300 font-medium">—</span>}
      </div>

      {/* Col 3: Role Badge */}
      <div role="cell">
        <UserRoleBadge role={user.role} />
      </div>

      {/* Col 4: Status Badge */}
      <div role="cell">
        <UserStatusBadge isActive={user.isActive} />
      </div>

      {/* Col 5: Joined Date */}
      <div role="cell" className="text-sm text-gray-950">
        {formatDate(user.createdAt)}
      </div>

      {/* Col 6: Action Menu (Client island) */}
      <div role="cell" className="flex items-center justify-end">
        <UserActionMenu
          user={user}
          currentAdminRole={currentAdminRole}
          currentAdminId={currentAdminId}
        />
      </div>
    </div>
  );
}
export default UserRow;
