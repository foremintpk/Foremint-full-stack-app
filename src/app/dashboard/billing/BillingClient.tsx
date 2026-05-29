'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { CustomerInvoiceItem, CustomerLlcItem } from '@/types/dashboard';
import { submitBankTransferReceipt, simulateStripePayment } from '@/lib/dashboard/actions';
import {
  CreditCard, DollarSign, FileText, Download, Upload,
  Check, Loader2, ExternalLink, Search, Filter,
  Building2, ChevronDown, AlertCircle
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

export default function BillingClient({ invoices, llcs, userId }: Props) {
  const [filter, setFilter] = useState<'all' | 'paid' | 'unpaid' | 'partial'>('all');
  const [search, setSearch] = useState('');
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);
  const [uploadingOrderId, setUploadingOrderId] = useState<string | null>(null);
  const [result, setResult] = useState<{ type: 'success' | 'error'; msg: string; id: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Stats
  const totalPaid = invoices.filter(i => i.status === 'paid' && i.type === 'order').reduce((s, i) => s + i.amount, 0);
  const totalUnpaid = invoices.filter(i => i.status !== 'paid' && i.type === 'order').reduce((s, i) => s + i.amount, 0);
  const totalInvoices = invoices.length;
  const unpaidCount = invoices.filter(i => i.status !== 'paid').length;

  // Filtered list
  const filtered = invoices.filter((inv) => {
    if (filter !== 'all' && inv.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        inv.name.toLowerCase().includes(q) ||
        inv.invoiceNumber.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleReceiptUpload = async (orderId: string, file: File) => {
    setUploadingOrderId(orderId);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const uploadRes = await fetch('/api/onboarding/upload-receipt', { method: 'POST', body: fd });
      if (!uploadRes.ok) throw new Error('Upload failed');
      const { url } = await uploadRes.json();
      const res = await submitBankTransferReceipt(orderId, url, file.name, file.size);
      if (!res.success) throw new Error(res.error);
      setResult({ type: 'success', msg: 'Receipt uploaded successfully!', id: orderId });
      router.refresh();
    } catch (err: any) {
      setResult({ type: 'error', msg: err.message || 'Upload failed', id: orderId });
    } finally {
      setUploadingOrderId(null);
    }
  };

  const handleCardPayment = (orderId: string) => {
    setPayingOrderId(orderId);
    startTransition(async () => {
      setResult(null);
      const res = await simulateStripePayment(orderId);
      if (res.success) {
        setResult({ type: 'success', msg: 'Payment confirmed!', id: orderId });
        router.refresh();
      } else {
        setResult({ type: 'error', msg: res.error || 'Payment failed', id: orderId });
      }
      setPayingOrderId(null);
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900 font-manrope">Billing</h1>
        <p className="text-sm text-gray-500 mt-1 font-inter">View invoices, upload payment proofs, and manage payments.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Invoices', value: totalInvoices, icon: FileText,   color: 'text-[#34088f]', bg: 'bg-[#34088f]/5' },
          { label: 'Unpaid',         value: unpaidCount,   icon: AlertCircle,color: 'text-rose-600',  bg: 'bg-rose-50' },
          { label: 'Total Paid',     value: `$${totalPaid.toLocaleString()}`,  icon: Check,   color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Outstanding',    value: `$${totalUnpaid.toLocaleString()}`,icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50' },
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

      {/* Filters */}
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
                  filter === f
                    ? 'bg-[#34088f] text-white'
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Invoice list */}
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
                        <span className="text-xs text-gray-400 font-inter">
                          {new Date(inv.date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 ml-13 sm:ml-0">
                    <div className="text-right mr-2">
                      <p className="text-sm font-black text-gray-900 font-manrope">${inv.amount.toLocaleString()}</p>
                      <PaymentBadge status={inv.status} />
                    </div>

                    {inv.type === 'order' && inv.status !== 'paid' && (
                      <div className="flex items-center gap-2">
                        <label className="cursor-pointer">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold transition-colors ${
                            uploadingOrderId === inv.id
                              ? 'bg-gray-200 text-gray-500'
                              : 'bg-white border border-gray-200 text-gray-600 hover:border-[#34088f] hover:text-[#34088f]'
                          }`}>
                            {uploadingOrderId === inv.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                            Receipt
                          </span>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*,.pdf"
                            disabled={uploadingOrderId !== null}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleReceiptUpload(inv.id, file);
                            }}
                          />
                        </label>
                        <button
                          onClick={() => handleCardPayment(inv.id)}
                          disabled={isPending || payingOrderId !== null}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#34088f] text-white text-[10px] font-bold hover:bg-[#2a0673] transition-colors disabled:opacity-50"
                        >
                          {payingOrderId === inv.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CreditCard className="w-3 h-3" />}
                          Pay
                        </button>
                      </div>
                    )}

                    {inv.downloadUrl && (
                      <a
                        href={inv.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>

                {result?.id === inv.id && (
                  <div className={`mt-3 p-2.5 rounded-lg text-xs font-inter ${
                    result.type === 'success'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-red-50 text-red-600 border border-red-200'
                  }`}>
                    {result.msg}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
