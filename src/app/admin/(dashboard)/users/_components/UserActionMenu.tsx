/**
 * @file src/app/admin/(dashboard)/users/_components/UserActionMenu.tsx
 * @description Client Component action menu dropdown for single user row.
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AdminUser, UserRole } from '@/types/admin';
import { Edit2, ShieldAlert, ShieldCheck, Trash2, MoreHorizontal } from 'lucide-react';
import { UserModal } from './UserModal';
import { UserDeactivateConfirm } from './UserDeactivateConfirm';
import { UserDeleteConfirm } from './UserDeleteConfirm';

interface UserActionMenuProps {
  user: AdminUser;
  currentAdminRole: UserRole;
  currentAdminId: string;
}

export function UserActionMenu({
  user,
  currentAdminRole,
  currentAdminId,
}: UserActionMenuProps): React.JSX.Element | null {
  const [isOpen, setIsOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'edit' | 'deactivate' | 'delete' | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Visibility: If caller is not 'administrator', hide menu completely
  if (currentAdminRole !== 'administrator') {
    return null;
  }

  const isSelf = user.id === currentAdminId;

  return (
    <div className="relative" ref={menuRef}>
      {/* Dropdown Toggle Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="p-2 rounded-full border border-[#e0d9f7] bg-white text-gray-500 hover:text-[#34088f] hover:border-[#34088f] transition-all"
        aria-label="Actions menu"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {/* Menu Options */}
      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-48 bg-white border border-[#e0d9f7] rounded-2xl shadow-[0_4px_20px_rgba(52,8,143,0.12)] z-30 overflow-hidden py-1 animate-in fade-in slide-in-from-top-1 duration-150 font-inter">
          {/* Edit */}
          <button
            onClick={() => {
              setModalMode('edit');
              setIsOpen(false);
            }}
            className="w-full px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-[#f4f0fe] hover:text-[#34088f] transition-all flex items-center gap-2 text-left"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Edit Profile
          </button>

          {/* Deactivate / Reactivate */}
          <button
            onClick={() => {
              if (isSelf) return;
              setModalMode('deactivate');
              setIsOpen(false);
            }}
            disabled={isSelf}
            className={`w-full px-4 py-2 text-xs font-semibold transition-all flex items-center gap-2 text-left ${
              isSelf
                ? 'opacity-40 cursor-not-allowed text-gray-400'
                : 'text-amber-600 hover:bg-amber-50'
            }`}
            title={isSelf ? 'You cannot deactivate yourself' : undefined}
          >
            {user.isActive ? (
              <>
                <ShieldAlert className="w-3.5 h-3.5" />
                Deactivate User
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5" />
                Reactivate User
              </>
            )}
          </button>

          {/* Delete */}
          <button
            onClick={() => {
              if (isSelf) return;
              setModalMode('delete');
              setIsOpen(false);
            }}
            disabled={isSelf}
            className={`w-full px-4 py-2 text-xs font-semibold border-t border-gray-100 transition-all flex items-center gap-2 text-left ${
              isSelf
                ? 'opacity-40 cursor-not-allowed text-gray-400'
                : 'text-red-600 hover:bg-red-50'
            }`}
            title={isSelf ? 'You cannot delete yourself' : undefined}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Account
          </button>
        </div>
      )}

      {/* Action Modals */}
      {modalMode === 'edit' && (
        <UserModal
          mode="edit"
          user={user}
          onClose={() => setModalMode(null)}
        />
      )}

      {modalMode === 'deactivate' && (
        <UserDeactivateConfirm
          user={user}
          onClose={() => setModalMode(null)}
        />
      )}

      {modalMode === 'delete' && (
        <UserDeleteConfirm
          user={user}
          onClose={() => setModalMode(null)}
        />
      )}
    </div>
  );
}
export default UserActionMenu;
