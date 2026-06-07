import React from 'react';
import { Expense, ExpenseCategory, UserRole } from '@/types/admin';
import { ExpenseCategoryBadge } from './ExpenseCategoryBadge';
import { ExpenseActionMenu } from './ExpenseActionMenu';

interface ExpenseRowProps {
  expense: Expense;
  currentAdminRole: UserRole;
  categories: ExpenseCategory[];
}

const formatPkr = (amount: number) =>
  new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

export function ExpenseCard({ expense, currentAdminRole, categories }: ExpenseRowProps) {
  return (
    <div className="flex flex-col p-4 bg-white border border-[#e0d9f7] rounded-2xl shadow-[0_1px_4px_rgba(52,8,143,0.06)] font-inter select-text">
      <div className="flex items-center justify-between mb-2">
        <ExpenseCategoryBadge
          category={{
            name: expense.categoryName,
            icon: expense.categoryIcon,
            color: expense.categoryColor,
          }}
        />
        <ExpenseActionMenu
          expense={expense}
          currentAdminRole={currentAdminRole}
          categories={categories}
        />
      </div>
      <div className="text-sm font-semibold text-gray-900 mb-1">
        {expense.description}
      </div>
      <div className="flex items-center justify-between mt-2">
        <div className="text-xs text-gray-500">{formatDate(expense.date)}</div>
        <div className="text-sm font-bold text-[#34088f]">{formatPkr(expense.amount)}</div>
      </div>
    </div>
  );
}

export function ExpenseRow({ expense, currentAdminRole, categories }: ExpenseRowProps) {
  return (
    <div
      role="row"
      className="grid grid-cols-[1.2fr_2fr_1fr_1fr_0.5fr] gap-4 px-6 py-4 bg-white border-b border-[#e0d9f7] hover:bg-[#f4f0fe]/50 transition-colors last:border-b-0 font-inter select-text items-center"
    >
      <div role="cell">
        <ExpenseCategoryBadge
          category={{
            name: expense.categoryName,
            icon: expense.categoryIcon,
            color: expense.categoryColor,
          }}
        />
      </div>
      <div role="cell" className="text-sm font-medium text-gray-900">
        {expense.description}
      </div>
      <div role="cell" className="text-sm text-gray-600 whitespace-nowrap">
        {formatDate(expense.date)}
      </div>
      <div role="cell" className="text-sm font-semibold text-[#34088f] text-right whitespace-nowrap">
        {formatPkr(expense.amount)}
      </div>
      <div role="cell" className="flex items-center justify-end">
        <ExpenseActionMenu
          expense={expense}
          currentAdminRole={currentAdminRole}
          categories={categories}
        />
      </div>
    </div>
  );
}
