'use client';

import React, { useState, useEffect, useRef } from 'react';
import { PaypalOrder, UserRole } from '@/types/admin';
import { Edit2, Trash2, MoreHorizontal } from 'lucide-react';
import { PaypalOrderModal } from './PaypalOrderModal';
import { PaypalOrderDeleteConfirm } from './PaypalOrderDeleteConfirm';

interface PaypalOrderActionMenuProps {
  order: PaypalOrder;
  currentAdminRole: UserRole;
}

export function PaypalOrderActionMenu({
  order,
  currentAdminRole,
}: PaypalOrderActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'edit' | 'delete' | null>(null);

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

  const canEdit = currentAdminRole === 'administrator' || currentAdminRole === 'manager';
  const canDelete = currentAdminRole === 'administrator';

  if (!canEdit && !canDelete) {
    return null;
  }

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
        <div className="absolute right-0 mt-1.5 w-40 bg-white border border-[#e0d9f7] rounded-2xl shadow-[0_4px_20px_rgba(52,8,143,0.12)] z-30 overflow-hidden py-1 animate-in fade-in slide-in-from-top-1 duration-150 font-inter">
          {/* Edit */}
          {canEdit && (
            <button
              onClick={() => {
                setModalMode('edit');
                setIsOpen(false);
              }}
              className="w-full px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-[#f4f0fe] hover:text-[#34088f] transition-all flex items-center gap-2 text-left"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit Order
            </button>
          )}

          {/* Delete */}
          {canDelete && (
            <button
              onClick={() => {
                setModalMode('delete');
                setIsOpen(false);
              }}
              className="w-full px-4 py-2 text-xs font-semibold border-t border-gray-100 text-red-600 hover:bg-red-50 transition-all flex items-center gap-2 text-left"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Order
            </button>
          )}
        </div>
      )}

      {/* Action Modals */}
      {modalMode === 'edit' && (
        <PaypalOrderModal
          mode="edit"
          order={order}
          onClose={() => setModalMode(null)}
        />
      )}

      {modalMode === 'delete' && (
        <PaypalOrderDeleteConfirm
          order={order}
          onClose={() => setModalMode(null)}
        />
      )}
    </div>
  );
}
