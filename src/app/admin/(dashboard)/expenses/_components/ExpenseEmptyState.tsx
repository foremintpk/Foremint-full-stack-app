import React from 'react';
import { Receipt } from 'lucide-react';

interface ExpenseEmptyStateProps {
  filtered?: boolean;
}

export function ExpenseEmptyState({ filtered = false }: ExpenseEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#e0d9f7] bg-white p-12 text-center shadow-[0_1px_4px_rgba(52,8,143,0.06)] font-inter select-text">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f4f0fe] text-[#34088f] mb-4">
        <Receipt className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 font-manrope">
        {filtered ? 'No expenses match your filters' : 'No expenses recorded yet'}
      </h3>
      <p className="mt-1 text-sm text-gray-500 font-inter">
        {filtered
          ? 'Try adjusting your search query or category/date filters.'
          : 'Create your first expense to get started.'}
      </p>
    </div>
  );
}
