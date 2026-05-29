import React from 'react';
import { Expense, ExpenseCategory, UserRole } from '@/types/admin';
import { ExpenseCategoryBadge } from './ExpenseCategoryBadge';
import { ExpenseActionMenu } from './ExpenseActionMenu';

interface ExpenseRowProps {
  expense: Expense;
  currentAdminRole: UserRole;
  categories: ExpenseCategory[];
}

export function ExpenseRow({ expense, currentAdminRole, categories }: ExpenseRowProps) {
  const formatPkr = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <>
      {/* Mobile Card View */}
      <div className="md:hidden flex flex-col p-4 bg-white border border-[#e0d9f7] rounded-2xl shadow-[0_1px_4px_rgba(52,8,143,0.06)] font-inter select-text">
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

      {/* Desktop Table Row */}
      <tr className="hidden md:table-row hover:bg-[#f4f0fe]/50 transition-colors border-b border-[#e0d9f7] last:border-b-0 font-inter select-text">
        <td className="px-6 py-4 whitespace-nowrap">
          <ExpenseCategoryBadge
            category={{
              name: expense.categoryName,
              icon: expense.categoryIcon,
              color: expense.categoryColor,
            }}
          />
        </td>
        <td className="px-6 py-4">
          <span className="text-sm font-medium text-gray-900">{expense.description}</span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <span className="text-sm text-gray-600">{formatDate(expense.date)}</span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right">
          <span className="text-sm font-semibold text-[#34088f]">{formatPkr(expense.amount)}</span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right">
          <ExpenseActionMenu 
            expense={expense} 
            currentAdminRole={currentAdminRole} 
            categories={categories} 
          />
        </td>
      </tr>
    </>
  );
}
