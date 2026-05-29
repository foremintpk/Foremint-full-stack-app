'use client';

import React, { useState } from 'react';
import { Expense, ExpenseCategory } from '@/types/admin';
import { createExpense, updateExpense } from '@/lib/admin/actions/expenseActions';
import { X, ChevronDown } from 'lucide-react';
import { ICON_EMOJI_MAP } from './ExpenseCategoryBadge';

interface ExpenseModalProps {
  mode: 'create' | 'edit';
  expense?: Expense;
  categories: ExpenseCategory[];
  onClose: () => void;
}

export function ExpenseModal({ mode, expense, categories, onClose }: ExpenseModalProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultDate = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    categoryId: expense?.categoryId || (categories.length > 0 ? categories[0].id : ''),
    description: expense?.description || '',
    date: expense?.date || defaultDate,
    amount: expense?.amount?.toString() || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    const fd = new FormData();
    fd.append('categoryId', formData.categoryId);
    fd.append('description', formData.description);
    fd.append('date', formData.date);
    fd.append('amount', formData.amount);

    let res;
    if (mode === 'create') {
      res = await createExpense(fd);
    } else {
      res = await updateExpense(expense!.id, fd);
    }

    if (res.error) {
      setError(res.error);
      setIsPending(false);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm font-inter select-text">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#e0d9f7] bg-[#f4f0fe] rounded-t-2xl shrink-0">
          <h2 className="text-lg font-bold text-[#34088f] font-manrope">
            {mode === 'create' ? 'New Expense' : 'Edit Expense'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-[#34088f] hover:bg-[#34088f]/10 rounded-full transition-colors"
            disabled={isPending}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto shrink">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <form id="expense-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Category */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleChange}
                  required
                  className="w-full appearance-none pl-4 pr-10 py-2 border border-[#e0d9f7] rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#34088f]/20 transition-all bg-white"
                >
                  <option value="" disabled>Select a category</option>
                  {categories.map((cat) => {
                    const emoji = ICON_EMOJI_MAP[cat.icon] || '🏷️';
                    return (
                      <option key={cat.id} value={cat.id}>
                        {emoji} {cat.name}
                      </option>
                    );
                  })}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={3}
                placeholder="What was this expense for?"
                className="w-full px-4 py-3 border border-[#e0d9f7] rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#34088f]/20 transition-all placeholder:text-gray-400"
              />
            </div>

            {/* Date & Amount */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-[#e0d9f7] rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#34088f]/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Amount (PKR) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">
                    PKR
                  </span>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    required
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full pl-12 pr-4 py-2 border border-[#e0d9f7] rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#34088f]/20 transition-all font-semibold"
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#e0d9f7] bg-gray-50 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-5 py-2 text-sm font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="expense-form"
            disabled={isPending}
            className="px-6 py-2 text-sm font-bold bg-[#34088f] hover:bg-[#34088f]/90 text-white rounded-full transition-all shadow-[0_1px_4px_rgba(52,8,143,0.06)] disabled:opacity-50 flex items-center gap-2"
          >
            {isPending ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              'Save Expense'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
