import React from 'react';
import { EarningsBreakdown } from '@/types/admin';
import { EarningsBarChart } from './EarningsBarChart';

interface EarningsCardProps {
  earnings: EarningsBreakdown;
}

const formatUSD = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

const ROWS = [
  { key: 'llcRevenue',         label: 'LLC Formations',      color: '#10b981', pctKey: 'llcPercent' },
  { key: 'paypalRevenue',      label: 'PayPal Accounts',     color: '#3b82f6', pctKey: 'paypalPercent' },
  { key: 'invoiceCommissions', label: 'Invoice Commissions', color: '#34088f', pctKey: 'invoicePercent' },
] as const;

export function EarningsCard({ earnings }: EarningsCardProps) {
  const isZero = earnings.totalEarnings === 0;

  return (
    <article
      aria-label="Revenue breakdown statistics"
      className="bg-white border border-[#e0d9f7] rounded-2xl p-6 shadow-[0_1px_4px_rgba(52,8,143,0.06)] hover:shadow-[0_8px_24px_rgba(52,8,143,0.10)] transition-all duration-200 md:col-span-2 flex flex-col gap-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider font-inter">Total Earnings</p>
          <h2 className="text-[34px] font-bold text-gray-900 font-manrope leading-none mt-2">
            {formatUSD(earnings.totalEarnings)}
          </h2>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider font-inter mt-1">
            All revenue combined
          </p>
        </div>
        {isZero && (
          <span className="self-start sm:self-auto text-xs font-bold text-[#f59e0b] bg-[#f59e0b]/10 px-3.5 py-1.5 rounded-full font-manrope uppercase tracking-wider animate-pulse">
            No revenue in this period
          </span>
        )}
      </div>

      {/* Bar chart */}
      <EarningsBarChart earnings={earnings} />

      {/* Summary rows */}
      <div className="border-t border-gray-100 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {ROWS.map((row) => (
          <div
            key={row.key}
            className="flex flex-col gap-1 px-4 py-3 rounded-xl bg-[#f8f7ff] border border-[#e0d9f7]"
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: row.color }} />
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider font-inter">
                {row.label}
              </span>
            </div>
            <span className="text-lg font-bold text-gray-900 font-manrope">
              {formatUSD((earnings as any)[row.key])}
            </span>
            <span className="text-[10px] text-gray-400 font-inter font-medium">
              {(earnings as any)[row.pctKey]}% of total
            </span>
          </div>
        ))}
      </div>
    </article>
  );
}
