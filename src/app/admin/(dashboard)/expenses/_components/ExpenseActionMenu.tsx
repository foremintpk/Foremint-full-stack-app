'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { Expense, ExpenseCategory, UserRole } from '@/types/admin';
import { ExpenseModal } from './ExpenseModal';
import { ExpenseDeleteConfirm } from './ExpenseDeleteConfirm';

interface ExpenseActionMenuProps {
  expense: Expense;
  currentAdminRole: UserRole;
  categories: ExpenseCategory[];
}

export function ExpenseActionMenu({ expense, currentAdminRole, categories }: ExpenseActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const canEdit = currentAdminRole === 'administrator' || currentAdminRole === 'manager';
  const canDelete = currentAdminRole === 'administrator';

  if (!canEdit && !canDelete) return null;

  return (
    <>
      <div className="relative inline-block text-left" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-900"
        >
          <MoreVertical className="h-4 w-4" />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-white shadow-[0_6px_20px_rgba(52,8,143,0.1)] ring-1 ring-black ring-opacity-5 z-20 overflow-hidden font-inter border border-[#e0d9f7]">
            <div className="py-1">
              {canEdit && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setShowEdit(true);
                  }}
                  className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#34088f] transition-colors"
                >
                  <Edit2 className="mr-3 h-4 w-4" />
                  Edit Expense
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setShowDelete(true);
                  }}
                  className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="mr-3 h-4 w-4" />
                  Delete Expense
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {showEdit && (
        <ExpenseModal
          mode="edit"
          expense={expense}
          categories={categories}
          onClose={() => setShowEdit(false)}
        />
      )}

      {showDelete && (
        <ExpenseDeleteConfirm
          expense={expense}
          onClose={() => setShowDelete(false)}
        />
      )}
    </>
  );
}
