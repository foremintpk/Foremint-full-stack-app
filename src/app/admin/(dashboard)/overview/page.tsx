import React from 'react';
import { redirect } from 'next/navigation';
import { Building2, CreditCard, TrendingUp } from 'lucide-react';
import { getAdminUser } from '@/lib/admin/getAdminUser';
import { getOverviewStats, DATE_RANGES } from '@/lib/admin/getOverviewStats';
import { DateRangeFilter } from '@/types/admin';
import { StatCard } from './_components/StatCard';
import { EarningsCard } from './_components/EarningsCard';
import { OverviewFilters } from './_components/OverviewFilters';
import { OrderTrendChart } from './_components/OrderTrendChart';

export const revalidate = 120;

interface PageProps {
  searchParams: Promise<{ filter?: string }>;
}

export default async function AdminOverviewPage({ searchParams }: PageProps) {
  const admin = await getAdminUser();
  if (!admin) {
    redirect('/sign-in?redirect=/admin/overview' as any);
  }

  const resolvedParams = await searchParams;
  let activeFilter: DateRangeFilter = '7d';
  const filterParam = resolvedParams.filter;
  if (filterParam && ['today', 'yesterday', '7d', '14d', '30d', '60d', '90d'].includes(filterParam)) {
    activeFilter = filterParam as DateRangeFilter;
  }

  const activeRange = DATE_RANGES.find((r) => r.key === activeFilter) || DATE_RANGES[2];
  const startDateStr = activeRange.startDate().toISOString();
  const endDateStr   = activeRange.endDate().toISOString();

  const stats = await getOverviewStats(activeFilter, startDateStr, endDateStr);

  return (
    <div className="space-y-6 font-inter">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-black font-manrope">Overview</h1>
          <p className="text-xs font-semibold text-gray-500 font-inter mt-1">
            Platform performance and aggregates at a glance
          </p>
        </div>
        <OverviewFilters
          activeFilter={activeFilter}
          filters={DATE_RANGES.map((f) => ({ label: f.label, key: f.key }))}
        />
      </div>

      {/* Stat cards (donut charts) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard
          title="LLC Registrations"
          icon={<Building2 className="w-5 h-5" />}
          iconBg="bg-emerald-50"
          iconColor="text-[#10b981]"
          total={stats.llc.total}
          stats={[
            { label: 'Pending',    value: stats.llc.pending,    statusKey: 'pending' },
            { label: 'Processing', value: stats.llc.processing, statusKey: 'processing' },
            { label: 'Completed',  value: stats.llc.completed,  statusKey: 'completed' },
          ]}
        />

        <StatCard
          title="PayPal Accounts"
          icon={<CreditCard className="w-5 h-5" />}
          iconBg="bg-blue-50"
          iconColor="text-[#3b82f6]"
          total={stats.paypal.total}
          stats={[
            { label: 'Pending',    value: stats.paypal.pending,    statusKey: 'pending' },
            { label: 'Processing', value: stats.paypal.processing, statusKey: 'processing' },
            { label: 'Completed',  value: stats.paypal.completed,  statusKey: 'completed' },
          ]}
        />
      </div>

      {/* Earnings bar chart card */}
      <EarningsCard earnings={stats.earnings} />

      {/* Daily order trend line chart */}
      <article className="bg-white border border-[#e0d9f7] rounded-2xl p-6 shadow-[0_1px_4px_rgba(52,8,143,0.06)] hover:shadow-[0_8px_24px_rgba(52,8,143,0.10)] transition-all duration-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#f4f0fe] text-[#34088f] flex-shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-[12px] font-bold text-gray-500 uppercase tracking-wider font-inter">
              Order Activity Trend
            </h2>
            <p className="text-[10px] text-gray-400 font-inter mt-0.5">
              Daily LLC & PayPal orders — {activeRange.label}
            </p>
          </div>
        </div>
        <OrderTrendChart data={stats.dailyTrend} />
      </article>

      {/* Cache timestamp */}
      <div className="text-[10px] font-medium text-gray-400 text-right font-inter">
        Last updated: {new Date(stats.fetchedAt).toLocaleTimeString()}
      </div>
    </div>
  );
}
