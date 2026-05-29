import React from 'react';
import { ExpenseStats } from '@/types/admin';

interface ExpenseStatsCardsProps {
  stats: ExpenseStats;
}

export function ExpenseStatsCards({ stats }: ExpenseStatsCardsProps) {
  const topCategories = [...stats.byCategory]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);

  const formatPkr = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Total Card */}
      <div className="rounded-2xl border border-[#e0d9f7] bg-white p-5 shadow-[0_1px_4px_rgba(52,8,143,0.06)] md:col-span-1">
        <div className="text-sm font-semibold text-gray-500 font-inter">Total Expenses</div>
        <div className="mt-2 text-3xl font-bold text-[#34088f] font-manrope">
          {formatPkr(stats.totalAmount)}
        </div>
        <div className="mt-1 text-xs text-gray-500 font-inter">
          {stats.totalExpenses} expenses recorded
        </div>
      </div>

      {/* Top Categories */}
      {topCategories.map((cat, idx) => (
        <div
          key={cat.categoryId}
          className="rounded-2xl border border-[#e0d9f7] bg-white p-4 shadow-[0_1px_4px_rgba(52,8,143,0.06)] flex flex-col justify-between"
          style={{ borderLeft: `4px solid ${cat.categoryColor}` }}
        >
          <div className="text-sm font-semibold text-gray-700 font-inter truncate">
            {cat.categoryName}
          </div>
          <div>
            <div className="mt-2 text-xl font-bold text-gray-900 font-manrope">
              {formatPkr(cat.amount)}
            </div>
            <div className="mt-1 text-xs text-gray-500 font-inter">
              {cat.count} expense{cat.count !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      ))}
      
      {/* Fill empty slots if less than 3 top categories */}
      {Array.from({ length: Math.max(0, 3 - topCategories.length) }).map((_, i) => (
        <div
          key={`empty-${i}`}
          className="rounded-2xl border border-dashed border-[#e0d9f7] bg-gray-50/50 p-4 flex items-center justify-center"
        >
          <span className="text-xs text-gray-400 font-medium">No category data</span>
        </div>
      ))}
    </div>
  );
}
