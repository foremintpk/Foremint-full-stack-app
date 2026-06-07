import React from 'react';
import { OrderDonutChart } from './OrderDonutChart';

interface StatItem {
  label: string;
  value: number;
  statusKey: string;
}

interface StatCardProps {
  title: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  total: number;
  stats: StatItem[];
}

const DOT_COLORS: Record<string, string> = {
  pending:    '#f59e0b',
  processing: '#3b82f6',
  completed:  '#10b981',
};

const BG_COLORS: Record<string, string> = {
  pending:    'bg-amber-50  border-amber-100',
  processing: 'bg-blue-50   border-blue-100',
  completed:  'bg-emerald-50 border-emerald-100',
};

const TEXT_COLORS: Record<string, string> = {
  pending:    'text-amber-700',
  processing: 'text-blue-700',
  completed:  'text-emerald-700',
};

export function StatCard({ title, icon, iconBg, iconColor, total, stats }: StatCardProps) {
  const pending    = stats.find((s) => s.statusKey === 'pending')?.value    ?? 0;
  const processing = stats.find((s) => s.statusKey === 'processing')?.value ?? 0;
  const completed  = stats.find((s) => s.statusKey === 'completed')?.value  ?? 0;

  return (
    <article
      aria-label={`${title} statistics`}
      className="bg-white border border-[#e0d9f7] rounded-2xl p-6 shadow-[0_1px_4px_rgba(52,8,143,0.06)] hover:shadow-[0_8px_24px_rgba(52,8,143,0.10)] transition-all duration-200 ease-in-out"
    >
      {/* ── Top header bar ── */}
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg} ${iconColor} flex-shrink-0`}>
          {icon}
        </div>
        <span className="text-[12px] font-bold text-gray-500 uppercase tracking-wider font-inter">
          {title}
        </span>
      </div>

      {/* ── Body: left stats  |  right donut ── */}
      <div className="flex items-center gap-6">

        {/* Left column */}
        <div className="flex-1 min-w-0 flex flex-col gap-5">

          {/* Big total number */}
          <div>
            <p className="text-[48px] font-extrabold text-gray-900 font-manrope leading-none">
              {total}
            </p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-inter mt-1.5">
              Total Orders
            </p>
          </div>

          {/* Status pill tags */}
          <div className="flex flex-wrap gap-2">
            {stats.map((item) => {
              const dot  = DOT_COLORS[item.statusKey] || '#6b7280';
              const bg   = BG_COLORS[item.statusKey]  || 'bg-gray-50 border-gray-100';
              const text = TEXT_COLORS[item.statusKey] || 'text-gray-700';
              return (
                <div
                  key={item.statusKey}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold font-inter ${bg} ${text}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: dot }} />
                  {item.label}
                  <span className="font-bold ml-0.5">{item.value}</span>
                </div>
              );
            })}
          </div>

          {/* Breakdown rows */}
          <div className="space-y-2 pt-3 border-t border-gray-100">
            {stats.map((item) => {
              const dot = DOT_COLORS[item.statusKey] || '#6b7280';
              const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
              return (
                <div key={item.label} className="flex items-center gap-3">
                  {/* Label + dot */}
                  <div className="flex items-center gap-2 w-24 flex-shrink-0">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dot }} />
                    <span className="text-[11px] text-gray-500 font-medium font-inter capitalize truncate">
                      {item.label}
                    </span>
                  </div>
                  {/* Bar */}
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${pct}%`, backgroundColor: dot }}
                    />
                  </div>
                  {/* Percent + count */}
                  <div className="flex items-center gap-2 flex-shrink-0 w-14 justify-end">
                    <span className="text-[10px] text-gray-400 font-inter">{pct}%</span>
                    <span className="text-[12px] font-bold text-gray-900 font-inter">{item.value}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column — big donut */}
        <div className="flex-shrink-0 flex items-center justify-center self-stretch">
          <OrderDonutChart
            total={total}
            pending={pending}
            processing={processing}
            completed={completed}
          />
        </div>
      </div>
    </article>
  );
}
