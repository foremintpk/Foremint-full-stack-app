import React from 'react';
import { FileText, TrendingUp, Percent, Calendar } from 'lucide-react';
import { InvoiceStats } from '@/types/admin';

interface InvoiceStatsCardsProps {
  stats: InvoiceStats;
}

export function InvoiceStatsCards({ stats }: InvoiceStatsCardsProps) {
  const formatPkr = (val: number) => {
    return `PKR ${new Intl.NumberFormat('en-US').format(val)}`;
  };

  const cards = [
    {
      label: 'Total Invoices',
      value: stats.totalInvoices,
      icon: FileText,
      iconColor: 'text-[#34088f]',
      bgColor: 'bg-[#f4f0fe]',
    },
    {
      label: 'Total Revenue',
      value: formatPkr(stats.totalRevenuePkr),
      icon: TrendingUp,
      iconColor: 'text-emerald-700',
      bgColor: 'bg-emerald-50',
      isCurrency: true,
    },
    {
      label: 'Total Commission',
      value: formatPkr(stats.totalCommission),
      icon: Percent,
      iconColor: 'text-blue-700',
      bgColor: 'bg-blue-50',
      isCurrency: true,
    },
    {
      label: 'This Month',
      value: stats.thisMonthCount,
      icon: Calendar,
      iconColor: 'text-purple-700',
      bgColor: 'bg-purple-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-inter">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="rounded-2xl border border-[#e0d9f7] bg-white p-5 shadow-[0_1px_4px_rgba(52,8,143,0.06)] hover:shadow-[0_6px_20px_rgba(52,8,143,0.1)] transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium text-gray-500">{card.label}</span>
                <span className={`mt-2 font-manrope font-bold text-gray-900 truncate ${card.isCurrency ? 'text-xl xl:text-2xl' : 'text-3xl'}`}>
                  {card.value}
                </span>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-full ${card.bgColor} ${card.iconColor} flex-shrink-0`}>
                <Icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
export default InvoiceStatsCards;
