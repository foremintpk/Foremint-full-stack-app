'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { CustomerInvoiceItem, CustomerLlcItem } from '@/types/dashboard';
import {
  DollarSign, FileText, Check, ExternalLink, Search,
  AlertCircle, ArrowRight,
} from 'lucide-react';

function PaymentBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    paid:    { label: 'Paid',    cls: 'bg-emerald-100 text-emerald-700' },
    unpaid:  { label: 'Unpaid',  cls: 'bg-rose-100 text-rose-700' },
    partial: { label: 'Partial', cls: 'bg-amber-100 text-amber-700' },
  };
  const cfg = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-manrope ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-manrope ${
      type === 'order' ? 'bg-[#34088f]/10 text-[#34088f]' : 'bg-blue-50 text-blue-600'
    }`}>
      {type === 'order' ? 'LLC Order' : 'Manual Invoice'}
    </span>
  );
}

interface Props {
  invoices: CustomerInvoiceItem[];
  llcs: CustomerLlcItem[];
  userId: string;
}

export default function BillingClient({ invoices }: Props) {
  const [filter, setFilter] = useState<'all' | 'paid' | 'unpaid' | 'partial'>('all');
  const [search, setSearch] = useState('');

  // Stats — derived from the canonical paid/pending amounts (in sync with admin)
  const totalPaid = invoices.filter(i => i.type === 'order').reduce((s, i) => s + i.paidAmount, 0);
  const totalUnpaid = invoices.filter(i => i.type === 'order').reduce((s, i) => s + i.pendingAmount, 0);
  const totalInvoices = invoices.length;
  const unpaidCount = invoices.filter(i => i.status !== 'paid').length;

  const filtered = invoices.filter((inv) => {
    if (filter !== 'all' && inv.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return inv.name.toLowerCase().includes(q) || inv.invoiceNumber.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900 font-manrope">Billing</h1>
        <p className="text-sm text-gray-500 mt-1 font-inter">View invoices and complete payments for your orders.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Invoices', value: totalInvoices, icon: FileText,    color: 'text-[#34088f]',   bg: 'bg-[#34088f]/5' },
          { label: 'Unpaid',         value: unpaidCount,   icon: AlertCircle, color: 'text-rose-600',    bg: 'bg-rose-50' },
          { label: 'Total Paid',     value: `$${totalPaid.toLocaleString()}`,    icon: Check,      color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Outstanding',    value: `$${totalUnpaid.toLocaleString()}`,  icon: DollarSign, color: 'text-amber-600',   bg: 'bg-amber-50' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className={`text-xl font-black font-manrope ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-500 font-inter mt-0.5">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Filters + list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search invoices..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm font-inter bg-gray-50 focus:bg-white focus:border-[#34088f] focus:ring-1 focus:ring-[#34088f]/20 outline-none transition-all"
            />
          </div>
          <div className="flex gap-1.5">
            {(['all', 'paid', 'unpaid', 'partial'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider font-manrope transition-colors ${
                  filter === f ? 'bg-[#34088f] text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-16 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-inter">No invoices found.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((inv) => (
              <div key={inv.id} className="px-6 py-4 hover:bg-gray-50/50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#34088f]/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FileText className="w-5 h-5 text-[#34088f]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 font-manrope">{inv.name}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-gray-400 font-mono font-inter">{inv.invoiceNumber}</span>
                        <TypeBadge type={inv.type} />
                        <span className="text-xs text-gray-400 font-inter">{new Date(inv.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 ml-13 sm:ml-0">
                    <div className="text-right mr-2">
                      {/* Show what's actually owed (pending) for unpaid/partial; full amount when paid */}
                      <p className="text-sm font-black text-gray-900 font-manrope">
                        ${(inv.status === 'paid' ? inv.amount : inv.pendingAmount).toLocaleString()}
                      </p>
                      {inv.status === 'partial' && inv.paidAmount > 0 && (
                        <p className="text-[10px] text-gray-400 font-inter">
                          ${inv.paidAmount.toLocaleString()} paid of ${inv.amount.toLocaleString()}
                        </p>
                      )}
                      <PaymentBadge status={inv.status} />
                    </div>

                    {/* Pay Now → redirects to the order's billing tab (canonical payment flow) */}
                    {inv.type === 'order' && inv.status !== 'paid' && (
                      <Link
                        href={`/dashboard/llc/${inv.id}?tab=billing` as any}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#34088f] text-white text-xs font-bold hover:bg-[#2a0673] transition-colors font-manrope whitespace-nowrap"
                      >
                        Pay Now <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}

                    {/* Receipt — proxied API link, never the raw Cloudinary URL */}
                    {inv.downloadUrl && (
                      <a
                        href={inv.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="View receipt"
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
