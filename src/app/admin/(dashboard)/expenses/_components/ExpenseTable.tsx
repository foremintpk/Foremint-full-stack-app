import React from 'react';
import { Expense, ExpenseCategory, UserRole } from '@/types/admin';
import { ExpenseRow } from './ExpenseRow';

interface ExpenseTableProps {
  expenses: Expense[];
  currentAdminRole: UserRole;
  categories: ExpenseCategory[];
}

export function ExpenseTable({ expenses, currentAdminRole, categories }: ExpenseTableProps) {
  return (
    <div className="w-full">
      {/* Mobile view container */}
      <div className="flex flex-col gap-3 md:hidden">
        {expenses.map((expense) => (
          <ExpenseRow 
            key={expense.id} 
            expense={expense} 
            currentAdminRole={currentAdminRole} 
            categories={categories} 
          />
        ))}
      </div>

      {/* Desktop view container */}
      <div className="hidden md:block w-full bg-white rounded-2xl border border-[#e0d9f7] shadow-[0_1px_4px_rgba(52,8,143,0.06)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-full divide-y divide-[#e0d9f7]">
            <thead className="bg-[#f4f0fe]">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[#34088f] uppercase tracking-wide">
                  Category
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[#34088f] uppercase tracking-wide">
                  Description
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[#34088f] uppercase tracking-wide">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-[#34088f] uppercase tracking-wide">
                  Amount
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-[#34088f] uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-[#e0d9f7]">
              {expenses.map((expense) => (
                <ExpenseRow 
                  key={expense.id} 
                  expense={expense} 
                  currentAdminRole={currentAdminRole} 
                  categories={categories} 
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
