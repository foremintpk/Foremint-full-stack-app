'use client';

import React, { useState } from 'react';
import { deleteExpense } from '@/lib/admin/actions/expenseActions';
import { Expense } from '@/types/admin';
import { AlertTriangle, X } from 'lucide-react';

interface ExpenseDeleteConfirmProps {
  expense: Expense;
  onClose: () => void;
}

export function ExpenseDeleteConfirm({ expense, onClose }: ExpenseDeleteConfirmProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    const { error: delError } = await deleteExpense(expense.id);
    if (delError) {
      setError(delError);
      setIsDeleting(false);
    } else {
      onClose();
    }
  };

  const formatPkr = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm font-inter select-text">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-red-100 bg-red-50 text-red-900 rounded-t-2xl shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h2 className="text-lg font-bold font-manrope">Delete Expense</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-red-100 rounded-full transition-colors"
            disabled={isDeleting}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 shrink-0 text-sm text-gray-700">
          <p>
            This permanently deletes the expense <strong>"{expense.description}"</strong> of{' '}
            <span className="font-semibold text-gray-900">{formatPkr(expense.amount)}</span>.
          </p>
          <p className="mt-2 text-red-600 font-semibold">This action cannot be undone.</p>

          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-bold bg-red-600 hover:bg-red-700 text-white rounded-full transition-all shadow-[0_1px_4px_rgba(220,38,38,0.2)] disabled:opacity-50 flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Expense'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
