import React from 'react';
import { ShoppingBag, Clock, PauseCircle, XCircle, DollarSign } from 'lucide-react';
import { PaypalOrderStats } from '@/types/admin';

interface PaypalOrderStatsCardsProps {
  stats: PaypalOrderStats;
}

export function PaypalOrderStatsCards({ stats }: PaypalOrderStatsCardsProps) {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(stats.totalAmount);

  const cards = [
    {
      label: 'Total Orders',
      value: stats.totalOrders,
      icon: ShoppingBag,
      iconColor: 'text-[#34088f]',
      bgColor: 'bg-[#f4f0fe]',
    },
    {
      label: 'Total Amount',
      value: formattedAmount,
      icon: DollarSign,
      iconColor: 'text-[#34088f]',
      bgColor: 'bg-[#f4f0fe]',
      isCurrency: true,
    },
    {
      label: 'Pending',
      value: stats.pending,
      icon: Clock,
      iconColor: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      label: 'Suspended',
      value: stats.suspended,
      icon: PauseCircle,
      iconColor: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      label: 'Failed',
      value: stats.failed,
      icon: XCircle,
      iconColor: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="rounded-2xl border border-[#e0d9f7] bg-white p-5 shadow-[0_1px_4px_rgba(52,8,143,0.06)] hover:shadow-[0_6px_20px_rgba(52,8,143,0.1)] transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-500 font-inter">{card.label}</span>
                <span className={`mt-2 font-manrope font-bold text-gray-900 ${card.isCurrency ? 'text-2xl xl:text-3xl' : 'text-3xl'}`}>
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
