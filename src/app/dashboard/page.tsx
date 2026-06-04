/**
 * @file src/app/(dashboard)/page.tsx
 * @description Main client dashboard overview page — premium SaaS portal
 * Shows stat summary, centralized action-required system, and LLC list.
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth/get-session';
import { getCachedDashboardData } from '@/lib/dashboard/getDashboardData';
import {
  Building2, AlertTriangle, CreditCard, RotateCcw, TrendingUp,
  ArrowRight, Clock, ChevronRight, FileText, Upload, AlertCircle, ExternalLink
} from 'lucide-react';

export const dynamic = 'force-dynamic';

// ── Status badge helpers ────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending:           { label: 'Pending',       cls: 'bg-amber-100 text-amber-700' },
    confirmed:         { label: 'Confirmed',      cls: 'bg-blue-100 text-blue-700' },
    processing:        { label: 'Processing',     cls: 'bg-indigo-100 text-indigo-700' },
    completed:         { label: 'Active',         cls: 'bg-emerald-100 text-emerald-700' },
    awaiting_documents:{ label: 'Docs Needed',    cls: 'bg-orange-100 text-orange-700' },
    awaiting_payment:  { label: 'Payment Needed', cls: 'bg-rose-100 text-rose-700' },
    rejected:          { label: 'Rejected',       cls: 'bg-red-100 text-red-700' },
    cancelled:         { label: 'Cancelled',      cls: 'bg-gray-100 text-gray-500' },
  };
  const config = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-manrope ${config.cls}`}>
      {config.label}
    </span>
  );
}

function ActionTypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
    document_resubmission: { label: 'Document',  cls: 'bg-orange-50 text-orange-600 border border-orange-200', icon: Upload },
    invoice_payment:       { label: 'Payment',   cls: 'bg-rose-50 text-rose-600 border border-rose-200',       icon: CreditCard },
    compliance_task:       { label: 'Compliance',cls: 'bg-purple-50 text-purple-600 border border-purple-200', icon: FileText },
    renewal_payment:       { label: 'Renewal',   cls: 'bg-blue-50 text-blue-600 border border-blue-200',       icon: RotateCcw },
  };
  const config = map[type] ?? { label: type, cls: 'bg-gray-100 text-gray-600 border border-gray-200', icon: AlertCircle };
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-manrope ${config.cls}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

export default async function DashboardOverviewPage() {
  let session;
  try {
    session = await getSession();
  } catch {
    redirect('/login');
  }

  const data = await getCachedDashboardData(
    session.user.id,
    session.profile.full_name || ''
  );
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
          Here's an overview of your LLC portfolio and pending actions.
        </p>
      </div>

      {/* ── Summary Stat Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total LLCs',        value: stats.totalLlcs,       icon: Building2,    color: 'text-[#34088f]',  bg: 'bg-[#34088f]/5' },
          { label: 'Active LLCs',       value: stats.activeLlcs,      icon: TrendingUp,   color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Pending Actions',   value: stats.pendingActions,  icon: AlertTriangle,color: 'text-amber-600',   bg: 'bg-amber-50' },
          { label: 'Pending Payments',  value: stats.pendingPayments, icon: CreditCard,   color: 'text-rose-600',    bg: 'bg-rose-50' },
          { label: 'Upcoming Renewals', value: stats.upcomingRenewals,icon: RotateCcw,    color: 'text-blue-600',    bg: 'bg-blue-50' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
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

      {/* ── Action Required Panel ──────────────────────────────────── */}
      {actions.length > 0 && (
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <h2 className="text-sm font-black text-gray-900 font-manrope">Actions Required</h2>
                <p className="text-xs text-gray-500 font-inter">{actions.length} item{actions.length > 1 ? 's' : ''} need your attention</p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-50">
            {actions.slice(0, 5).map((action) => (
              <div key={action.id} className="px-6 py-4 flex items-start gap-4 hover:bg-gray-50/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <ActionTypeBadge type={action.type} />
                    {action.priority === 'high' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold text-red-600 bg-red-50 border border-red-200 uppercase tracking-wider">
                        <AlertCircle className="w-2.5 h-2.5" /> High Priority
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-gray-900 font-inter">{action.title}</p>
                  <p className="text-xs text-gray-500 font-inter mt-0.5 line-clamp-1">{action.description}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] text-gray-400 font-inter flex items-center gap-1">
                      <Building2 className="w-3 h-3" /> {action.llcName}
                    </span>
                    {action.dueDate && (
                      <span className="text-[10px] text-gray-400 font-inter flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Due {new Date(action.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <Link
                  href={`/dashboard/llc/${action.llcId}?tab=${
                    action.type === 'document_resubmission' ? 'documents' :
                    action.type === 'invoice_payment' ? 'billing' :
                    action.type === 'renewal_payment' ? 'compliance' : 'overview'
                  }` as any}
                  className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#34088f] text-white text-xs font-semibold hover:bg-[#2a0673] transition-colors font-inter"
                >
                  Resolve
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── LLC List ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-black text-gray-900 font-manrope">My LLCs</h2>
            <p className="text-xs text-gray-500 font-inter mt-0.5">{llcs.length} LLC{llcs.length !== 1 ? 's' : ''} in your portfolio</p>
          </div>
          <Link
            href="/dashboard/billing"
            className="text-xs font-semibold text-[#34088f] hover:text-[#2a0673] flex items-center gap-1 transition-colors font-inter"
          >
            View billing
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {llcs.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#34088f]/5 flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-[#34088f]/40" />
            </div>
            <p className="text-sm font-semibold text-gray-900 font-manrope">No LLCs yet</p>
            <p className="text-xs text-gray-500 font-inter mt-1">Your LLC registrations will appear here once submitted.</p>
            <Link
              href="/onboarding"
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#34088f] text-white text-sm font-semibold hover:bg-[#2a0673] transition-colors font-inter"
            >
              Start a New LLC
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider font-manrope">
                    <th className="text-left px-6 py-3 font-semibold">LLC Name</th>
                    <th className="text-left px-6 py-3 font-semibold">Status</th>
                    <th className="text-left px-6 py-3 font-semibold">State</th>
                    <th className="text-left px-6 py-3 font-semibold">Renewal</th>
                    <th className="text-left px-6 py-3 font-semibold">Balance</th>
                    <th className="text-left px-6 py-3 font-semibold">Compliance</th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {llcs.map((llc) => (
                    <tr key={llc.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#34088f]/10 flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-4 h-4 text-[#34088f]" />
                          </div>
                          <span className="font-semibold text-gray-900 font-manrope text-sm truncate max-w-[180px]">{llc.llcName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4"><StatusBadge status={llc.status} /></td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-medium text-gray-700 font-inter">{llc.formationStateName || llc.formationState || '—'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-gray-600 font-inter">
                          {llc.renewalDate ? new Date(llc.renewalDate).toLocaleDateString() : '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {llc.pendingAmount > 0 ? (
                          <span className="text-xs font-bold text-rose-600 font-manrope">${llc.pendingAmount.toLocaleString()}</span>
                        ) : (
                          <span className="text-xs text-emerald-600 font-semibold font-inter">Paid</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          llc.complianceState === 'compliant'       ? 'bg-emerald-100 text-emerald-700' :
                          llc.complianceState === 'action_required' ? 'bg-orange-100 text-orange-700' :
                          llc.complianceState === 'renewal_due'     ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {llc.complianceState === 'compliant'       ? 'Compliant' :
                           llc.complianceState === 'action_required' ? 'Action Required' :
                           llc.complianceState === 'renewal_due'     ? 'Renewal Due' : 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/llc/${llc.id}` as any}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#34088f] hover:text-[#2a0673] transition-colors font-inter"
                        >
                          View <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {llcs.map((llc) => (
                <Link
                  key={llc.id}
                  href={`/dashboard/llc/${llc.id}` as any}
                  className="flex items-center gap-4 px-4 py-4 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#34088f]/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-[#34088f]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 font-manrope text-sm truncate">{llc.llcName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusBadge status={llc.status} />
                      <span className="text-[10px] text-gray-500 font-inter">{llc.formationStateName || llc.formationState}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
