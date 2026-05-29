/**
 * @file src/app/admin/(dashboard)/users/_components/UserCard.tsx
 * @description Server Component representing a stacked card item for mobile user list.
 */

import React from 'react';
import { AdminUser, UserRole } from '@/types/admin';
import { UserRoleBadge } from './UserRoleBadge';
import { UserStatusBadge } from './UserStatusBadge';
import { UserActionMenu } from './UserActionMenu';
import { formatDate } from '@/lib/admin/formatters';

interface UserCardProps {
  user: AdminUser;
  currentAdminRole: UserRole;
  currentAdminId: string;
}

export function UserCard({
  user,
  currentAdminRole,
  currentAdminId,
}: UserCardProps): React.JSX.Element {
  const initials = (user.fullName || user.email)
    .substring(0, 2)
    .toUpperCase();

  return (
    <div
      className="p-5 bg-white border border-[#e0d9f7] rounded-2xl transition-all duration-150 select-text flex flex-col gap-4 shadow-[0_1px_4px_rgba(52,8,143,0.06)] hover:shadow-[0_6px_20px_rgba(52,8,143,0.1)]"
    >
      {/* Header Info */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-[#f4f0fe] text-[#34088f] flex items-center justify-center font-bold text-base shrink-0 overflow-hidden select-none border border-[#e0d9f7]">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.fullName || 'User'} className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
            <h4 className="font-bold text-gray-900 truncate font-manrope">
              {user.fullName || 'No Name Set'}
            </h4>
            <UserRoleBadge role={user.role} />
          </div>
          <p className="text-xs text-gray-500 truncate select-all">{user.email}</p>
        </div>
      </div>

      {/* Details List */}
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#e0d9f7] text-xs font-inter">
        <div>
          <span className="block text-gray-400 font-semibold mb-0.5">Phone</span>
          <span className="text-[#111111] font-medium truncate block select-all">
            {user.phone || <span className="text-gray-300 font-medium">—</span>}
          </span>
        </div>
        <div>
          <span className="block text-gray-400 font-semibold mb-0.5 font-inter">Status</span>
          <UserStatusBadge isActive={user.isActive} />
        </div>
        <div>
          <span className="block text-gray-400 font-semibold mb-0.5 font-inter">Joined</span>
          <span className="text-gray-600 font-medium">
            {formatDate(user.createdAt)}
          </span>
        </div>
      </div>

      {/* Actions Row */}
      {currentAdminRole === 'administrator' && (
        <div className="flex items-center justify-end pt-3 border-t border-[#e0d9f7] mt-1">
          <UserActionMenu
            user={user}
            currentAdminRole={currentAdminRole}
            currentAdminId={currentAdminId}
          />
        </div>
      )}
    </div>
  );
}
export default UserCard;
