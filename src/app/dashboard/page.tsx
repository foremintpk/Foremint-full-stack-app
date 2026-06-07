/**
 * @file src/app/dashboard/page.tsx
 * @description Main client dashboard overview page — premium SaaS portal
 */

import { redirect } from 'next/navigation';
import { getSession, isB2BRole } from '@/lib/auth/get-session';
import { getCachedDashboardData, getCachedB2BDashboardData } from '@/lib/dashboard/getDashboardData';
import {
  Building2, AlertTriangle, CreditCard, RotateCcw, TrendingUp,
} from 'lucide-react';
import { ActionsAccordion } from '@/components/dashboard/ActionsAccordion';
import { LlcCompaniesGrid } from '@/components/dashboard/LlcCompaniesGrid';

export const dynamic = 'force-dynamic';

export default async function DashboardOverviewPage() {
  let session;
  try {
    session = await getSession();
  } catch {
    redirect('/login');
  }

  const isB2B = isB2BRole(session.profile.role);
  const data = isB2B
    ? await getCachedB2BDashboardData(session.user.id, session.profile.full_name || '', session.profile)
    : await getCachedDashboardData(session.user.id, session.profile.full_name || '', session.profile);
  const { stats, llcs, actions } = data;
  const firstName = session.profile.full_name?.split(' ')[0] || 'there';

  return (
    <div className="space-y-8">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-black text-gray-900 font-manrope">
          Welcome back, {firstName} 👋
        </h1>
        <p className="text-sm text-gray-500 mt-1 font-inter">
          {isB2B
            ? "Here's an overview of the LLCs shared with you (read-only)."
            : "Here's an overview of your LLC portfolio and pending actions."}
        </p>
      </div>

      {/* ── Actions Required (accordion, closed by default) ────────── */}
      {!isB2B && <ActionsAccordion actions={actions} />}

      {/* ── Summary Stat Cards ─────────────────────────────────────── */}
      <div className={`grid grid-cols-1 sm:grid-cols-3 gap-4 ${isB2B ? 'lg:grid-cols-3' : 'lg:grid-cols-5'}`}>
        {(isB2B
          ? [
              { label: 'Total LLCs',        value: stats.totalLlcs,        icon: Building2,  color: 'text-[#34088f]',   bg: 'bg-[#34088f]/5' },
              { label: 'Active LLCs',       value: stats.activeLlcs,       icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Upcoming Renewals', value: stats.upcomingRenewals, icon: RotateCcw,  color: 'text-blue-600',    bg: 'bg-blue-50' },
            ]
          : [
              { label: 'Total LLCs',        value: stats.totalLlcs,        icon: Building2,     color: 'text-[#34088f]',   bg: 'bg-[#34088f]/5' },
              { label: 'Active LLCs',       value: stats.activeLlcs,       icon: TrendingUp,    color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Pending Actions',   value: stats.pendingActions,   icon: AlertTriangle, color: 'text-amber-600',   bg: 'bg-amber-50' },
              { label: 'Pending Payments',  value: stats.pendingPayments,  icon: CreditCard,    color: 'text-rose-600',    bg: 'bg-rose-50' },
              { label: 'Upcoming Renewals', value: stats.upcomingRenewals, icon: RotateCcw,     color: 'text-blue-600',    bg: 'bg-blue-50' },
            ]
        ).map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-row sm:flex-col items-center sm:items-start gap-4 sm:gap-3 shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className={`text-2xl font-black font-manrope ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-gray-500 font-inter mt-0.5">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Companies (LLCs) Grid ──────────────────────────────────── */}
      <LlcCompaniesGrid llcs={llcs} />
    </div>
  );
}
