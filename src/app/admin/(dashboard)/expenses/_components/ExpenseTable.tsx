import React from 'react';
import { Expense, ExpenseCategory, UserRole } from '@/types/admin';
import { ExpenseCard, ExpenseRow } from './ExpenseRow';

interface ExpenseTableProps {
  expenses: Expense[];
  currentAdminRole: UserRole;
  categories: ExpenseCategory[];
}

export function ExpenseTable({ expenses, currentAdminRole, categories }: ExpenseTableProps) {
  return (
    <div className="w-full">
      {/* Mobile view */}
      <div className="flex flex-col gap-3 md:hidden">
        {expenses.map((expense) => (
          <ExpenseCard
            key={expense.id}
            expense={expense}
            currentAdminRole={currentAdminRole}
            categories={categories}
          />
        ))}
      </div>

      {/* Desktop CSS-grid view */}
      <div className="hidden md:block w-full bg-white rounded-2xl border border-[#e0d9f7] shadow-[0_1px_4px_rgba(52,8,143,0.06)]">
        {/* Header */}
        <div className="grid grid-cols-[1.2fr_2fr_1fr_1fr_0.5fr] gap-4 px-6 py-3 bg-[#f4f0fe] border-b border-[#e0d9f7] rounded-t-2xl text-xs font-semibold text-[#34088f] uppercase tracking-wide select-none font-manrope">
          <div>Category</div>
          <div>Description</div>
          <div>Date</div>
          <div className="text-right">Amount</div>
          <div className="text-right">Actions</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-[#e0d9f7] [&>*:last-child]:rounded-b-2xl">
          {expenses.map((expense) => (
            <ExpenseRow
              key={expense.id}
              expense={expense}
              currentAdminRole={currentAdminRole}
              categories={categories}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
