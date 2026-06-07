'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Building2, Search, Plus, CalendarDays, MapPin, ArrowRight } from 'lucide-react';
import type { CustomerLlcItem } from '@/types/dashboard';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending:            { label: 'Pending',        cls: 'bg-amber-100 text-amber-700' },
    confirmed:          { label: 'Confirmed',      cls: 'bg-blue-100 text-blue-700' },
    processing:         { label: 'Processing',     cls: 'bg-indigo-100 text-indigo-700' },
    completed:          { label: 'Active',         cls: 'bg-emerald-100 text-emerald-700' },
    awaiting_documents: { label: 'Docs Needed',    cls: 'bg-orange-100 text-orange-700' },
    awaiting_payment:   { label: 'Payment Needed', cls: 'bg-rose-100 text-rose-700' },
    rejected:           { label: 'Rejected',       cls: 'bg-red-100 text-red-700' },
    cancelled:          { label: 'Cancelled',      cls: 'bg-gray-100 text-gray-500' },
  };
  const config = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider font-manrope ${config.cls}`}>
      {config.label}
    </span>
  );
}

function CompanyAvatar() {
  return (
    <div className="w-11 h-11 rounded-xl bg-[#34088f]/10 flex items-center justify-center flex-shrink-0">
      <Building2 className="w-5 h-5 text-[#34088f]" />
    </div>
  );
}

export function LlcCompaniesGrid({ llcs }: { llcs: CustomerLlcItem[] }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return llcs;
    return llcs.filter(
      (l) =>
        l.llcName.toLowerCase().includes(q) ||
        (l.formationStateName ?? l.formationState ?? '').toLowerCase().includes(q)
    );
  }, [llcs, query]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-5 border-b border-gray-100">
        <div>
          <h2 className="text-xl font-black text-gray-900 font-manrope">My Companies</h2>
          <p className="text-xs text-gray-500 font-inter mt-0.5">
            {llcs.length} compan{llcs.length !== 1 ? 'ies' : 'y'} in your portfolio
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Search */}
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search companies…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#34088f]/20 focus:border-[#34088f]/50 font-inter transition-all"
            />
          </div>
          {/* New LLC button */}
          <Link
            href="/onboarding"
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#34088f] text-white text-xs font-semibold hover:bg-[#2a0673] transition-colors font-inter whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            New LLC
          </Link>
        </div>
      </div>

      {/* Empty state */}
      {llcs.length === 0 ? (
        <div className="p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#34088f]/5 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-[#34088f]/40" />
          </div>
          <p className="text-sm font-semibold text-gray-900 font-manrope">No companies yet</p>
          <p className="text-xs text-gray-500 font-inter mt-1">
            Your LLC registrations will appear here once submitted.
          </p>
          <Link
            href="/onboarding"
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#34088f] text-white text-sm font-semibold hover:bg-[#2a0673] transition-colors font-inter"
          >
            Start a New LLC
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-gray-500 font-inter">No companies match &ldquo;{query}&rdquo;</p>
        </div>
      ) : (
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((llc) => (
            <Link
              key={llc.id}
              href={`/dashboard/llc/${llc.id}` as any}
              className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-[#34088f]/30 transition-all duration-200 min-h-[200px]"
            >
              {/* Top: avatar + name/state on left · status on right */}
              <div className="flex items-start justify-between gap-3">
                {/* Left */}
                <div className="flex items-start gap-3 min-w-0">
                  <CompanyAvatar />
                  <div className="min-w-0 pt-0.5">
                    <p className="text-sm font-black text-gray-900 font-manrope leading-snug line-clamp-2">
                      {llc.llcName}
                    </p>
                    {(llc.formationStateName || llc.formationState) && (
                      <span className="inline-flex items-center gap-1 mt-1 text-[11px] text-gray-500 font-inter">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        {llc.formationStateName || llc.formationState}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: status badge */}
                <div className="flex-shrink-0 pt-0.5">
                  <StatusBadge status={llc.status} />
                </div>
              </div>

              {/* Pending amount capsule (only when due) */}
              {llc.pendingAmount > 0 && (
                <div className="mt-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-xs font-bold text-rose-600 font-manrope">
                    ${llc.pendingAmount.toLocaleString()} due
                  </span>
                </div>
              )}

              {/* Spacer to push footer down */}
              <div className="flex-1" />

              {/* Footer: formation date */}
              <div className="border-t border-gray-100 pt-3 mt-4">
                <span className="inline-flex items-center gap-1.5 text-[11px] text-gray-400 font-inter">
                  <CalendarDays className="w-3.5 h-3.5 flex-shrink-0" />
                  {llc.formationDate
                    ? new Date(llc.formationDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : '—'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
