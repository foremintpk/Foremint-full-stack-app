'use client';

import { useState, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { OrderDetail } from '@/types/admin';
import { submitDocumentProof, submitBankTransferReceipt, simulateStripePayment } from '@/lib/dashboard/actions';
import {
  Building2, FileText, CreditCard, Shield, Clock,
  CheckCircle2, AlertCircle, Upload, ExternalLink,
  XCircle, ChevronRight, ArrowLeft, Eye, Download,
  DollarSign, Users, MapPin, Hash, Calendar,
  Loader2, Check, AlertTriangle, RotateCcw, Info
} from 'lucide-react';

// ── Tab Configuration ──────────────────────────────────────────────────────
const TABS = [
  { key: 'overview',   label: 'Overview',   icon: Building2 },
  { key: 'documents',  label: 'Documents',  icon: FileText },
  { key: 'billing',    label: 'Billing',    icon: CreditCard },
  { key: 'addons',     label: 'Add-ons',    icon: Users },
  { key: 'compliance', label: 'Compliance', icon: Shield },
  { key: 'activity',   label: 'Activity',   icon: Clock },
] as const;

type TabKey = typeof TABS[number]['key'];

// ── Status helpers ──────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending:            { label: 'Pending',        cls: 'bg-amber-100 text-amber-700' },
    confirmed:          { label: 'Confirmed',      cls: 'bg-blue-100 text-blue-700' },
    processing:         { label: 'Processing',     cls: 'bg-indigo-100 text-indigo-700' },
    completed:          { label: 'Active',          cls: 'bg-emerald-100 text-emerald-700' },
    awaiting_documents: { label: 'Docs Needed',    cls: 'bg-orange-100 text-orange-700' },
    awaiting_payment:   { label: 'Payment Needed', cls: 'bg-rose-100 text-rose-700' },
    formed:             { label: 'Formed',         cls: 'bg-emerald-100 text-emerald-700' },
    cancelled:          { label: 'Cancelled',      cls: 'bg-gray-100 text-gray-500' },
  };
  const cfg = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-manrope ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
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

// ── Card Wrapper ───────────────────────────────────────────────────────────
function Card({ title, icon: Icon, children, className = '' }: {
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${className}`}>
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2.5">
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-[#34088f]/5 flex items-center justify-center">
            <Icon className="w-4 h-4 text-[#34088f]" />
          </div>
        )}
        <h3 className="text-sm font-black text-gray-900 font-manrope">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────
interface Props {
  llc: OrderDetail;
  userId: string;
  activeTab: string;
}

export default function LlcDetailClient({ llc, userId, activeTab }: Props) {
  const [tab, setTab] = useState<TabKey>((activeTab as TabKey) || 'overview');
  const router = useRouter();

  return (
    <div className="space-y-6">
      {/* Back link + LLC header */}
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#34088f] transition-colors font-inter mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#34088f]/10 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-6 h-6 text-[#34088f]" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 font-manrope">{llc.llcName}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <StatusBadge status={llc.status} />
                <PaymentStatusBadge status={llc.paymentStatus} />
                {llc.formationStateName && (
                  <span className="text-xs text-gray-500 font-inter flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {llc.formationStateName}
                  </span>
                )}
                {llc.orderNumber && (
                  <span className="text-xs text-gray-400 font-inter flex items-center gap-1">
                    <Hash className="w-3 h-3" /> {llc.orderNumber}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Horizontal tabs */}
      <div className="border-b border-gray-200 -mx-1">
        <nav className="flex gap-1 overflow-x-auto px-1 scrollbar-hide">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap font-manrope
                ${tab === key
                  ? 'border-[#34088f] text-[#34088f]'
                  : 'border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-200'
                }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div>
        {tab === 'overview'   && <OverviewTab llc={llc} />}
        {tab === 'documents'  && <DocumentsTab llc={llc} userId={userId} />}
        {tab === 'billing'    && <BillingTab llc={llc} userId={userId} />}
        {tab === 'addons'     && <AddonsTab llc={llc} />}
        {tab === 'compliance' && <ComplianceTab llc={llc} />}
        {tab === 'activity'   && <ActivityTab llc={llc} />}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: OVERVIEW
// ═══════════════════════════════════════════════════════════════════════════
function OverviewTab({ llc }: { llc: OrderDetail }) {
  const formSnapshot = llc.formSnapshot || {};
  const step3 = (formSnapshot as any)?.step3 || {};

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Formation Info */}
      <Card title="Formation Information" icon={Info}>
        <div className="space-y-4">
          {[
            { label: 'Entity Type',        value: llc.entityType || 'LLC' },
            { label: 'Member Type',         value: llc.memberType || '—' },
            { label: 'Formation State',     value: llc.formationStateName || llc.formationState || '—' },
            { label: 'Formation Package',   value: llc.formationPackageName || ((formSnapshot as any)?.step2?.packageName) || llc.formationPackage || '—' },
            { label: 'Order Number',        value: llc.orderNumber || '—' },
            { label: 'Submitted',           value: llc.submittedAt ? new Date(llc.submittedAt).toLocaleDateString() : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <span className="text-xs text-gray-500 font-inter">{label}</span>
              <span className="text-sm font-semibold text-gray-900 font-manrope">{value}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Business Address */}
      <Card title="Business Address" icon={MapPin}>
        {step3.businessAddress ? (
          <div className="space-y-3">
            {[
              { label: 'Street',  value: step3.businessAddress?.street || step3.businessAddress?.addressLine1 || '—' },
              { label: 'City',    value: step3.businessAddress?.city || '—' },
              { label: 'State',   value: step3.businessAddress?.state || '—' },
              { label: 'ZIP',     value: step3.businessAddress?.zip || step3.businessAddress?.postalCode || '—' },
              { label: 'Country', value: step3.businessAddress?.country || '—' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-xs text-gray-500 font-inter">{label}</span>
                <span className="text-sm font-medium text-gray-900 font-inter">{value}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 font-inter">No business address on file.</p>
        )}
      </Card>

      {/* Members */}
      <Card title={`Members (${llc.members.length})`} icon={Users} className="lg:col-span-2">
        {llc.members.length === 0 ? (
          <p className="text-xs text-gray-400 font-inter text-center py-6">No members recorded.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {llc.members.map((member) => (
              <div
                key={member.index}
                className="p-4 rounded-xl border border-gray-100 bg-gray-50/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-gray-900 font-manrope">{member.name}</p>
                    <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider font-manrope">{member.position}</span>
                  </div>
                  {member.hasResubmitRequest && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold text-orange-600 bg-orange-50 border border-orange-200 uppercase tracking-wider">
                      <AlertTriangle className="w-2.5 h-2.5" /> Resubmit
                    </span>
                  )}
                </div>
                {(member.address || member.city || member.country) && (
                  <p className="text-xs text-gray-500 font-inter mt-2">
                    {[member.address, member.city, member.state, member.country].filter(Boolean).join(', ')}
                  </p>
                )}
                {member.idDocUrl && (
                  <a
                    href={member.idDocUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#34088f] hover:text-[#2a0673] mt-2 transition-colors"
                  >
                    <Eye className="w-3 h-3" /> View ID Document
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Financial Summary */}
      <Card title="Financial Summary" icon={DollarSign} className="lg:col-span-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Package Price', value: `$${llc.packagePrice.toLocaleString()}` },
            { label: 'State Fee',     value: `$${llc.stateFee.toLocaleString()}` },
            { label: 'Add-ons Total', value: `$${llc.addonsTotal.toLocaleString()}` },
            { label: 'Grand Total',   value: `$${llc.grandTotal.toLocaleString()}`, bold: true },
          ].map(({ label, value, bold }) => (
            <div key={label} className="p-4 rounded-xl bg-gray-50 text-center">
              <p className={`text-lg font-manrope ${bold ? 'font-black text-[#34088f]' : 'font-bold text-gray-900'}`}>{value}</p>
              <p className="text-[10px] text-gray-500 mt-1 font-inter uppercase tracking-wider">{label}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: DOCUMENTS
// ═══════════════════════════════════════════════════════════════════════════
function DocumentsTab({ llc, userId }: { llc: OrderDetail; userId: string }) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const router = useRouter();

  const activeDocuments = llc.documents.filter(d => d.isActive !== false);
  const pendingResubmissions = llc.resubmissionRequests.filter(r => r.status === 'pending');

  const handleResubmitUpload = useCallback(async (slotKey: string, file: File) => {
    setUploading(slotKey);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      // Upload to Cloudinary via existing API
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await fetch('/api/onboarding/upload-receipt', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error('Upload failed');
      }

      const { url } = await uploadRes.json();

      // Submit proof via server action
      const result = await submitDocumentProof(llc.id, slotKey, url, file.name, file.size);
      if (!result.success) {
        throw new Error(result.error || 'Failed to submit document');
      }

      setUploadSuccess(slotKey);
      router.refresh();
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(null);
    }
  }, [llc.id, router]);

  return (
    <div className="space-y-6">
      {/* Pending resubmissions */}
      {pendingResubmissions.length > 0 && (
        <Card title={`Resubmission Required (${pendingResubmissions.length})`} icon={AlertTriangle}>
          <div className="space-y-4">
            {pendingResubmissions.map((req) => (
              <div key={req.id} className="p-4 rounded-xl bg-orange-50 border border-orange-200">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 font-inter">
                      Field: <span className="font-mono text-orange-700">{req.fieldName}</span>
                      {req.memberIndex != null && (
                        <span className="text-gray-500 ml-2">(Member #{req.memberIndex + 1})</span>
                      )}
                    </p>
                    {req.note && <p className="text-xs text-gray-600 mt-1 font-inter">{req.note}</p>}
                    <p className="text-[10px] text-gray-400 mt-1.5 font-inter">
                      Requested {new Date(req.requestedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {uploadSuccess === req.fieldName ? (
                  <div className="mt-3 flex items-center gap-2 text-emerald-600 text-xs font-semibold">
                    <Check className="w-4 h-4" /> Document uploaded successfully!
                  </div>
                ) : (
                  <label className="mt-3 flex items-center gap-2 cursor-pointer">
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      uploading === req.fieldName
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-[#34088f] text-white hover:bg-[#2a0673]'
                    }`}>
                      {uploading === req.fieldName ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...</>
                      ) : (
                        <><Upload className="w-3.5 h-3.5" /> Upload Replacement</>
                      )}
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,.pdf"
                      disabled={uploading !== null}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleResubmitUpload(req.fieldName, file);
                      }}
                    />
                  </label>
                )}
              </div>
            ))}
          </div>
          {uploadError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-inter">
              {uploadError}
            </div>
          )}
        </Card>
      )}

      {/* All documents */}
      <Card title={`Documents (${activeDocuments.length})`} icon={FileText}>
        {activeDocuments.length === 0 ? (
          <div className="text-center py-10">
            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-inter">No documents uploaded yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeDocuments.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-[#34088f]/5 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-[#34088f]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 font-manrope truncate">{doc.fileName}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[10px] text-gray-400 font-inter uppercase tracking-wider">{doc.documentType}</span>
                      {doc.slotKey && (
                        <span className="text-[10px] text-gray-400 font-inter">{doc.slotKey}</span>
                      )}
                      <span className="text-[10px] text-gray-400 font-inter">
                        {new Date(doc.uploadedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {doc.isVerified && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 uppercase">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Verified
                    </span>
                  )}
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-[#34088f]"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: BILLING
// ═══════════════════════════════════════════════════════════════════════════
function BillingTab({ llc, userId }: { llc: OrderDetail; userId: string }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  const isPaid = llc.paymentStatus === 'paid';

  const handleReceiptUpload = async (file: File) => {
    setUploading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const uploadRes = await fetch('/api/onboarding/upload-receipt', { method: 'POST', body: fd });
      if (!uploadRes.ok) throw new Error('Upload failed');
      const { url } = await uploadRes.json();
      const res = await submitBankTransferReceipt(llc.id, url, file.name, file.size);
      if (!res.success) throw new Error(res.error);
      setResult({ type: 'success', msg: 'Receipt uploaded! Admin will verify your payment shortly.' });
      router.refresh();
    } catch (err: any) {
      setResult({ type: 'error', msg: err.message || 'Failed to upload receipt' });
    } finally {
      setUploading(false);
    }
  };

  const handleSimulatePayment = () => {
    startTransition(async () => {
      setResult(null);
      const res = await simulateStripePayment(llc.id);
      if (res.success) {
        setResult({ type: 'success', msg: 'Payment confirmed! Order status updated.' });
        router.refresh();
      } else {
        setResult({ type: 'error', msg: res.error || 'Payment failed' });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Invoice Summary */}
      <Card title="Invoice Summary" icon={CreditCard}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Package',     value: `$${llc.packagePrice}` },
            { label: 'State Fee',   value: `$${llc.stateFee}` },
            { label: 'Add-ons',     value: `$${llc.addonsTotal}` },
            { label: 'Total',       value: `$${llc.grandTotal}`, bold: true },
          ].map(({ label, value, bold }) => (
            <div key={label} className="text-center p-3 rounded-xl bg-gray-50">
              <p className={`text-lg font-manrope ${bold ? 'font-black text-[#34088f]' : 'font-bold text-gray-900'}`}>{value}</p>
              <p className="text-[10px] text-gray-500 font-inter mt-0.5 uppercase tracking-wider">{label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between py-3 border-t border-gray-100">
          <span className="text-sm font-inter text-gray-600">Payment Status</span>
          <PaymentStatusBadge status={llc.paymentStatus} />
        </div>

        {llc.paymentReceiptUrl && (
          <div className="flex items-center justify-between py-3 border-t border-gray-100">
            <span className="text-sm font-inter text-gray-600">Payment Receipt</span>
            <a
              href={llc.paymentReceiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#34088f] hover:text-[#2a0673] transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> View Receipt
            </a>
          </div>
        )}
      </Card>

      {/* Payment Actions */}
      {!isPaid && (
        <Card title="Complete Payment" icon={DollarSign}>
          {result && (
            <div className={`mb-4 p-3 rounded-xl text-xs font-inter ${
              result.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                : 'bg-red-50 border border-red-200 text-red-600'
            }`}>
              {result.msg}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bank Transfer */}
            <div className="p-5 rounded-xl border-2 border-dashed border-gray-200 hover:border-[#34088f]/30 transition-colors text-center">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-900 font-manrope mb-1">Bank Transfer</p>
              <p className="text-xs text-gray-500 font-inter mb-4">Upload your payment receipt for manual verification.</p>
              <label className="cursor-pointer">
                <span className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                  uploading
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-white border border-gray-200 text-gray-700 hover:border-[#34088f] hover:text-[#34088f]'
                }`}>
                  {uploading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...</> : 'Choose File'}
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleReceiptUpload(file);
                  }}
                />
              </label>
            </div>

            {/* Card Payment (simulated) */}
            <div className="p-5 rounded-xl border border-gray-200 bg-gradient-to-br from-[#34088f]/[0.02] to-indigo-50/50 text-center">
              <CreditCard className="w-8 h-8 text-[#34088f]/60 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-900 font-manrope mb-1">Card Payment</p>
              <p className="text-xs text-gray-500 font-inter mb-4">Pay instantly with credit or debit card.</p>
              <button
                onClick={handleSimulatePayment}
                disabled={isPending}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#34088f] text-white text-xs font-semibold hover:bg-[#2a0673] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing...</> : <>Pay ${llc.grandTotal}</>}
              </button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: COMPLIANCE
// ═══════════════════════════════════════════════════════════════════════════
function AddonsTab({ llc }: { llc: OrderDetail }) {
  const selectedAddons = llc.addonsSnapshot || []

  return (
    <div className="space-y-6">
      <Card title="Selected Add-ons" icon={Users}>
        {selectedAddons.length > 0 ? (
          <div className="space-y-3">
            {selectedAddons.map((addon, index) => {
              const record = addon as Record<string, any>
              const name = record.name || record.title || 'Add-on'
              const price = Number(record.price || 0)

              return (
                <div key={`${name}-${index}`} className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50/60 p-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 font-manrope">{name}</p>
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-inter">Selected by customer</p>
                  </div>
                  <span className="text-sm font-bold text-[#34088f] font-manrope">
                    ${price.toLocaleString()}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-xs text-gray-400 font-inter">No add-ons selected.</p>
        )}
      </Card>

      <Card title="Add-ons Summary" icon={DollarSign}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl bg-gray-50 p-4 text-center">
            <p className="text-lg font-black text-gray-900 font-manrope">{selectedAddons.length}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Add-ons</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-4 text-center">
            <p className="text-lg font-black text-gray-900 font-manrope">
              ${llc.addonsTotal.toLocaleString()}
            </p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Customer Add-ons Total</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-4 text-center">
            <p className="text-lg font-black text-[#34088f] font-manrope">
              ${llc.grandTotal.toLocaleString()}
            </p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Grand Total</p>
          </div>
        </div>
      </Card>
    </div>
  )
}

function ComplianceTab({ llc }: { llc: OrderDetail }) {
  const formSnapshot = llc.formSnapshot || {};

  // Determine compliance items
  const items: Array<{ label: string; status: 'done' | 'pending' | 'warning'; detail: string }> = [
    {
      label: 'Order Submitted',
      status: llc.submittedAt ? 'done' : 'pending',
      detail: llc.submittedAt ? `Submitted on ${new Date(llc.submittedAt).toLocaleDateString()}` : 'Awaiting submission',
    },
    {
      label: 'Payment Completed',
      status: llc.paymentStatus === 'paid' ? 'done' : llc.paymentStatus === 'partial' ? 'warning' : 'pending',
      detail: llc.paymentStatus === 'paid' ? 'Payment verified' : llc.paymentStatus === 'partial' ? 'Partial payment received' : 'Payment pending',
    },
    {
      label: 'Documents Verified',
      status: llc.documents.some(d => !d.isVerified && d.isActive !== false) ? 'warning' : llc.documents.length > 0 ? 'done' : 'pending',
      detail: llc.documents.length === 0
        ? 'No documents uploaded'
        : `${llc.documents.filter(d => d.isVerified).length}/${llc.documents.filter(d => d.isActive !== false).length} verified`,
    },
    {
      label: 'Formation Processing',
      status: ['completed', 'formed'].includes(llc.status) ? 'done' : llc.status === 'processing' ? 'warning' : 'pending',
      detail: ['completed', 'formed'].includes(llc.status) ? 'LLC successfully formed' : llc.status === 'processing' ? 'Currently being processed' : 'Awaiting processing',
    },
  ];

  const pendingResubmissions = llc.resubmissionRequests.filter(r => r.status === 'pending');

  return (
    <div className="space-y-6">
      {/* Compliance Checklist */}
      <Card title="Compliance Checklist" icon={Shield}>
        <div className="space-y-4">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-start gap-4 py-3 border-b border-gray-50 last:border-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                item.status === 'done' ? 'bg-emerald-100' :
                item.status === 'warning' ? 'bg-amber-100' : 'bg-gray-100'
              }`}>
                {item.status === 'done' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> :
                 item.status === 'warning' ? <AlertTriangle className="w-4 h-4 text-amber-600" /> :
                 <Clock className="w-4 h-4 text-gray-400" />}
              </div>
              <div>
                <p className={`text-sm font-semibold font-manrope ${
                  item.status === 'done' ? 'text-gray-900' : 'text-gray-600'
                }`}>{item.label}</p>
                <p className="text-xs text-gray-500 font-inter mt-0.5">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Pending Actions */}
      {pendingResubmissions.length > 0 && (
        <Card title="Open Resubmission Requests" icon={AlertCircle}>
          <div className="space-y-3">
            {pendingResubmissions.map((req) => (
              <div key={req.id} className="p-4 rounded-xl bg-orange-50 border border-orange-200">
                <p className="text-sm font-semibold text-gray-900 font-inter">
                  Document field: <span className="font-mono text-orange-700">{req.fieldName}</span>
                </p>
                {req.note && <p className="text-xs text-gray-600 mt-1 font-inter">{req.note}</p>}
                <p className="text-[10px] text-gray-400 mt-1.5 font-inter">
                  Requested on {new Date(req.requestedAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: ACTIVITY
// ═══════════════════════════════════════════════════════════════════════════
function ActivityTab({ llc }: { llc: OrderDetail }) {
  return (
    <Card title="Status History" icon={Clock}>
      {llc.statusHistory.length === 0 ? (
        <div className="text-center py-10">
          <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-inter">No activity recorded yet.</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-100" />

          <div className="space-y-6">
            {llc.statusHistory.map((entry, idx) => (
              <div key={entry.id} className="relative flex gap-4 pl-4">
                {/* Dot */}
                <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  idx === 0 ? 'bg-[#34088f] ring-4 ring-[#34088f]/10' : 'bg-white border-2 border-gray-200'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-white' : 'bg-gray-400'}`} />
                </div>

                <div className="pb-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={entry.oldStatus} />
                    <ChevronRight className="w-3 h-3 text-gray-400" />
                    <StatusBadge status={entry.newStatus} />
                  </div>
                  {entry.note && (
                    <p className="text-xs text-gray-600 font-inter mt-1.5">{entry.note}</p>
                  )}
                  <p className="text-[10px] text-gray-400 font-inter mt-1">
                    {new Date(entry.changedAt).toLocaleString()} • {entry.changedBy}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
