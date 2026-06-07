'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { OrderDetail, OrderDocument } from '@/types/admin';
import { submitDocumentProof, submitBankTransferReceipt } from '@/lib/dashboard/actions';
import {
  Building2, FileText, CreditCard, Shield, Clock,
  CheckCircle2, AlertCircle, Upload, ExternalLink,
  XCircle, ChevronRight, ArrowLeft, Eye, Download,
  DollarSign, Users, MapPin, Hash, Calendar,
  Loader2, Check, AlertTriangle, RotateCcw, Info,
  Copy, CheckCheck, Mail, Globe, Briefcase
} from 'lucide-react';

// ── Tab Configuration ──────────────────────────────────────────────────────
const TABS = [
  { key: 'overview',  label: 'Overview',  icon: Building2 },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'billing',   label: 'Billing',   icon: CreditCard },
  { key: 'addons',    label: 'Add-ons',   icon: Users },
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
  /** B2B customers view assigned LLCs read-only — hides all upload/action affordances. */
  readOnly?: boolean;
}

export default function LlcDetailClient({ llc, userId, activeTab, readOnly = false }: Props) {
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
                {readOnly && (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                    Read-only
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
        {tab === 'overview'  && <OverviewTab llc={llc} />}
        {tab === 'documents' && <DocumentsTab llc={llc} userId={userId} readOnly={readOnly} />}
        {tab === 'billing'   && <BillingTab llc={llc} userId={userId} readOnly={readOnly} />}
        {tab === 'addons'    && <AddonsTab llc={llc} />}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: OVERVIEW — helpers
// ═══════════════════════════════════════════════════════════════════════════

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500 font-inter flex-shrink-0">{label}</span>
      <span className="text-sm font-semibold text-gray-900 font-manrope text-right">{value || '—'}</span>
    </div>
  );
}

// Copyable pill — value shown as a capsule, copy button always visible
function CopyField({ label, value }: { label: string; value: string | null }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500 font-inter flex-shrink-0">{label}</span>
      {value ? (
        <div className="flex items-center gap-2">
          {/* Capsule-shaped value */}
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#34088f]/8 border border-[#34088f]/20 text-sm font-semibold text-[#34088f] font-manrope select-all">
            {value}
          </span>
          {/* Always-visible copy button */}
          <button
            onClick={copy}
            title="Copy to clipboard"
            className="flex-shrink-0 p-1.5 rounded-lg border border-gray-200 bg-white hover:border-[#34088f]/40 hover:bg-[#34088f]/5 text-gray-400 hover:text-[#34088f] transition-colors"
          >
            {copied
              ? <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
              : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      ) : (
        <span className="text-sm font-semibold text-gray-400 font-manrope">—</span>
      )}
    </div>
  );
}

// Address section — copy button always visible, copies full address as one string
function AddressSection({ title, address }: { title: string; address: any | null }) {
  const [copied, setCopied] = useState(false);
  const parts = address
    ? [address.street, address.city, address.state, address.zip, address.country].filter(Boolean)
    : [];
  const fullAddress = parts.join(', ');

  const copy = () => {
    if (!fullAddress) return;
    navigator.clipboard.writeText(fullAddress).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider font-manrope">{title}</p>
        {parts.length > 0 && (
          <button
            onClick={copy}
            title="Copy address"
            className="flex-shrink-0 p-1.5 rounded-lg border border-gray-200 bg-white hover:border-[#34088f]/40 hover:bg-[#34088f]/5 text-gray-400 hover:text-[#34088f] transition-colors"
          >
            {copied
              ? <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
              : <Copy className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
      {parts.length > 0
        ? <div className="space-y-0.5">{parts.map((p, i) => <p key={i} className="text-sm font-medium text-gray-900 font-inter">{p}</p>)}</div>
        : <p className="text-sm text-gray-400 font-inter italic">Not on file yet.</p>
      }
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: OVERVIEW
// ═══════════════════════════════════════════════════════════════════════════
function OverviewTab({ llc }: { llc: OrderDetail }) {
  const formSnapshot = llc.formSnapshot || {};
  const step3 = (formSnapshot as any)?.step3 || {};
  const cd = llc.companyDetails;

  const formatDate = (d: string | null | undefined) =>
    d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;

  const businessAddr = cd?.businessAddress || step3.businessAddress || null;
  const mailingAddr  = cd?.mailingAddress  || null;
  const tradingAddr  = cd?.tradingAddress  || null;

  const hasAnyAddress = [businessAddr, mailingAddr, tradingAddr].some(
    a => a && Object.values(a).some(Boolean)
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Business Details */}
        <Card title="Business Details" icon={Briefcase}>
          <InfoRow label="Package" value={llc.formationPackageName || (formSnapshot as any)?.step2?.packageName || llc.formationPackage} />
          <InfoRow label="Members" value={
            llc.memberType
              ? llc.memberType.toLowerCase().includes('multi') ? 'Multi-member' : 'Single-member'
              : undefined
          } />
          <InfoRow label="State" value={llc.formationStateName || llc.formationState} />
          <InfoRow label="Formation Date" value={formatDate(cd?.formationDate)} />
          <CopyField label="EIN Number" value={cd?.einNumber ?? null} />
          <CopyField label="Filing ID" value={cd?.filingId ?? null} />
          <InfoRow label="State Renewal Date" value={formatDate(cd?.stateRenewalDate)} />
          <InfoRow label="Renewal Fees" value={cd?.stateRenewalFees != null ? `$${Number(cd.stateRenewalFees).toLocaleString()}` : undefined} />
        </Card>

        {/* Card 2: Business Addresses */}
        <Card title="Business Addresses" icon={MapPin}>
          {hasAnyAddress ? (
            <div className="space-y-6">
              <AddressSection title="Business Address" address={businessAddr} />
              <AddressSection title="Mailing Address"  address={mailingAddr} />
              <AddressSection title="Trading Address"  address={tradingAddr} />
            </div>
          ) : (
            <p className="text-sm text-gray-400 font-inter italic">No addresses on file yet.</p>
          )}
        </Card>
      </div>

      {/* Members */}
      <Card title={`Members (${llc.members.length})`} icon={Users}>
        {llc.members.length === 0 ? (
          <p className="text-sm text-gray-400 font-inter text-center py-6">No members recorded.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {llc.members.map((member) => (
              <div key={member.index} className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
                {/* Header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                  <div className="w-9 h-9 rounded-xl bg-[#34088f]/10 flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 text-[#34088f]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-gray-900 font-manrope">{member.name}</p>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[#34088f]/10 text-[#34088f] font-manrope">
                        {member.position || 'Member'}
                      </span>
                      {member.hasResubmitRequest && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold text-orange-600 bg-orange-50 border border-orange-200 uppercase tracking-wider">
                          <AlertTriangle className="w-2.5 h-2.5" /> Resubmit
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Detail rows */}
                <div className="px-5 py-4 space-y-3">
                  <div className="flex gap-3">
                    <span className="text-xs text-gray-400 font-inter w-20 flex-shrink-0 pt-0.5">Address:</span>
                    <span className="text-sm text-gray-800 font-inter">
                      {[member.address, member.city, member.state, member.country].filter(Boolean).join(', ') || '—'}
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-xs text-gray-400 font-inter w-20 flex-shrink-0 pt-0.5">SSN / ITIN:</span>
                    <span className="text-sm text-gray-800 font-inter">{member.ssnItin || '—'}</span>
                  </div>
                </div>

                {/* Identity document */}
                {member.idDocId && (
                  <div className="px-5 pb-4 border-t border-gray-100 pt-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-manrope mb-3">
                      Identity Document
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`/api/documents/${member.idDocId}/view`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#34088f] text-white text-xs font-semibold hover:bg-[#2a0673] transition-colors font-inter"
                      >
                        <Eye className="w-3.5 h-3.5" /> View ID
                      </a>
                      <a
                        href={`/api/documents/${member.idDocId}/view?download=1`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-gray-200 text-gray-700 text-xs font-semibold hover:border-[#34088f]/40 hover:text-[#34088f] transition-colors font-inter"
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </a>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: DOCUMENTS — helpers
// ═══════════════════════════════════════════════════════════════════════════

// Mirrors admin DocumentsTab PRIMARY_SLOTS exactly — slot_key is the source of truth.
const PRIMARY_SLOT_LABELS: Record<string, string> = {
  articles_of_organization: 'Articles of Organization',
  operating_agreement:      'Operating Agreement',
  ein_letter:               'EIN Confirmation Letter',
};
const PRIMARY_SLOT_KEYS = new Set(Object.keys(PRIMARY_SLOT_LABELS));

function docCategory(doc: OrderDocument): 'primary' | 'additional' | 'hidden' {
  const key = doc.slotKey ?? '';
  if (PRIMARY_SLOT_KEYS.has(key)) return 'primary';
  if (key === 'additional') return 'additional';
  return 'hidden'; // member IDs, payment receipts, misc onboarding — not shown to customer
}

function formatDocTitle(documentType: string, slotKey: string | null): string {
  if (slotKey && PRIMARY_SLOT_LABELS[slotKey]) return PRIMARY_SLOT_LABELS[slotKey];
  // Additional docs use the admin-set documentType as their display title
  return (documentType || 'Document').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function DocRow({ doc }: { doc: OrderDocument }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-10 h-10 rounded-lg bg-[#34088f]/8 flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-[#34088f]" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 font-manrope">
            {formatDocTitle(doc.documentType, doc.slotKey ?? null)}
          </p>
          <p className="text-[11px] text-gray-400 font-inter mt-0.5 truncate">{doc.fileName}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {doc.isVerified && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 uppercase">
                <CheckCircle2 className="w-2.5 h-2.5" /> Verified
              </span>
            )}
            <span className="text-[10px] text-gray-400 font-inter">
              {new Date(doc.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <a
          href={`/api/documents/${doc.id}/view`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:border-[#34088f] hover:text-[#34088f] transition-colors font-inter"
        >
          <Eye className="w-3.5 h-3.5" /> View
        </a>
        {/* Download: use the same /view route with ?download=1 — there is no separate /download route */}
        <a
          href={`/api/documents/${doc.id}/view?download=1`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#34088f] text-white text-xs font-semibold hover:bg-[#2a0673] transition-colors font-inter"
        >
          <Download className="w-3.5 h-3.5" /> Download
        </a>
      </div>
    </div>
  );
}

function DocSection({ title, docs, emptyMsg }: { title: string; docs: OrderDocument[]; emptyMsg: string }) {
  if (docs.length === 0) {
    return (
      <div>
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider font-manrope mb-3">{title}</h4>
        <p className="text-xs text-gray-400 font-inter italic pl-1">{emptyMsg}</p>
      </div>
    );
  }
  return (
    <div>
      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider font-manrope mb-3">
        {title} <span className="text-gray-400">({docs.length})</span>
      </h4>
      <div className="space-y-3">
        {docs.map(doc => <DocRow key={doc.id} doc={doc} />)}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: DOCUMENTS
// ═══════════════════════════════════════════════════════════════════════════
function DocumentsTab({ llc, userId, readOnly = false }: { llc: OrderDetail; userId: string; readOnly?: boolean }) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const router = useRouter();

  const activeDocs     = llc.documents.filter(d => d.isActive !== false);
  const primaryDocs    = activeDocs.filter(d => docCategory(d) === 'primary');
  const additionalDocs = activeDocs.filter(d => docCategory(d) === 'additional');
  const visibleDocs    = primaryDocs.length + additionalDocs.length;

  const pendingResubmissions = llc.resubmissionRequests.filter(r => r.status === 'pending');

  const handleResubmitUpload = useCallback(async (slotKey: string, file: File) => {
    setUploading(slotKey);
    setUploadError(null);
    setUploadSuccess(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await fetch('/api/onboarding/upload-receipt', { method: 'POST', body: formData });
      if (!uploadRes.ok) throw new Error('Upload failed');
      const { url } = await uploadRes.json();
      const result = await submitDocumentProof(llc.id, slotKey, url, file.name, file.size);
      if (!result.success) throw new Error(result.error || 'Failed to submit document');
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
      {/* Pending resubmissions — owner action only, hidden in read-only (B2B) view */}
      {!readOnly && pendingResubmissions.length > 0 && (
        <Card title={`Resubmission Required (${pendingResubmissions.length})`} icon={AlertTriangle}>
          <div className="space-y-4">
            {pendingResubmissions.map((req) => (
              <div key={req.id} className="p-4 rounded-xl bg-orange-50 border border-orange-200">
                <p className="text-sm font-semibold text-gray-900 font-inter">
                  Field: <span className="font-mono text-orange-700">{req.fieldName}</span>
                  {req.memberIndex != null && <span className="text-gray-500 ml-2">(Member #{req.memberIndex + 1})</span>}
                </p>
                {req.note && <p className="text-xs text-gray-600 mt-1 font-inter">{req.note}</p>}
                <p className="text-[10px] text-gray-400 mt-1.5 font-inter">
                  Requested {new Date(req.requestedAt).toLocaleDateString()}
                </p>
                {uploadSuccess === req.fieldName ? (
                  <div className="mt-3 flex items-center gap-2 text-emerald-600 text-xs font-semibold">
                    <Check className="w-4 h-4" /> Uploaded successfully!
                  </div>
                ) : (
                  <label className="mt-3 flex items-center gap-2 cursor-pointer w-fit">
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      uploading === req.fieldName ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-[#34088f] text-white hover:bg-[#2a0673]'
                    }`}>
                      {uploading === req.fieldName
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...</>
                        : <><Upload className="w-3.5 h-3.5" /> Upload Replacement</>}
                    </div>
                    <input type="file" className="hidden" accept="image/*,.pdf" disabled={uploading !== null}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleResubmitUpload(req.fieldName, f); }} />
                  </label>
                )}
              </div>
            ))}
            {uploadError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-inter">{uploadError}</div>
            )}
          </div>
        </Card>
      )}

      {/* Documents — 2 sections: Primary and Additional only */}
      <Card title={`Documents (${visibleDocs})`} icon={FileText}>
        {visibleDocs === 0 ? (
          <div className="text-center py-10">
            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-inter">No documents available yet.</p>
          </div>
        ) : (
          <div className="space-y-8">
            <DocSection
              title="Primary Documents"
              docs={primaryDocs}
              emptyMsg="No primary documents uploaded yet."
            />
            <DocSection
              title="Additional Documents"
              docs={additionalDocs}
              emptyMsg="No additional documents uploaded yet."
            />
          </div>
        )}
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: BILLING
// ═══════════════════════════════════════════════════════════════════════════
function BillingTab({ llc, userId, readOnly = false }: { llc: OrderDetail; userId: string; readOnly?: boolean }) {
  const [result, setResult] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  // ── Mirror admin BillingTab math exactly ──────────────────────────────────
  // Base Total = order.grandTotal (coupon already baked in).
  // effective   = grandTotal + charges − discounts
  // pending     = max(0, effective − payments)
  const entries        = llc.billingEntries || [];
  const couponDiscount = llc.couponDiscount || 0;
  const chargesTotal   = entries.filter(e => e.type === 'charge').reduce((s, e) => s + e.amount, 0);
  const discountsTotal = entries.filter(e => e.type === 'discount').reduce((s, e) => s + e.amount, 0);
  const paymentsTotal  = entries.filter(e => e.type === 'payment').reduce((s, e) => s + e.amount, 0);

  const baseTotal   = llc.grandTotal;
  const effective   = baseTotal + chargesTotal - discountsTotal;
  const pendingAmt  = Math.max(0, effective - paymentsTotal);
  const isPaid      = pendingAmt <= 0;
  const receiptDoc  = llc.documents.find(d => d.slotKey === 'payment_receipt' && d.isActive !== false);

  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
      setResult({ type: 'success', msg: 'Receipt uploaded. Admin will verify your payment shortly.' });
      router.refresh();
    } catch (err: any) {
      setResult({ type: 'error', msg: err.message || 'Upload failed. Please try again.' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* ── Payment Summary card ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Card header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#34088f]/5 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-[#34088f]" />
            </div>
            <h3 className="text-sm font-black text-gray-900 font-manrope">Payment Summary</h3>
          </div>
          {/* Status + pending badge */}
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider font-manrope ${
            isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
          }`}>
            {isPaid ? 'Paid' : <>Unpaid · {fmt(pendingAmt)}</>}
          </span>
        </div>

        <div className="px-6 py-4 space-y-0">
          {/* Base order fees */}
          {[
            { label: 'Package Fee',   value: llc.packagePrice },
            { label: 'Add-ons Total', value: llc.addonsTotal },
            { label: 'State Fee',     value: llc.stateFee },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-3 border-b border-gray-50">
              <span className="text-sm text-gray-500 font-inter">{label}</span>
              <span className="text-sm font-semibold text-gray-900 font-manrope">{fmt(value)}</span>
            </div>
          ))}

          {/* Coupon discount (display only — already inside grandTotal) */}
          {couponDiscount > 0 && (
            <div className="flex items-center justify-between py-3 border-b border-gray-50">
              <span className="text-sm text-gray-500 font-inter">Coupon Discount</span>
              <span className="text-sm font-semibold text-emerald-600 font-manrope">-{fmt(couponDiscount)}</span>
            </div>
          )}

          {/* Base Total */}
          <div className="flex items-center justify-between py-4 mt-2 border-t-2 border-gray-200">
            <span className="text-sm font-bold text-gray-900 font-manrope">Base Total (USD)</span>
            <span className="text-xl font-black text-[#34088f] font-manrope">{fmt(baseTotal)}</span>
          </div>

          {/* Billing Adjustments — one row per admin entry (no duplicate aggregates) */}
          {entries.length > 0 && (
            <div className="mt-4 pt-4 border-t border-dashed border-gray-200">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 font-inter">
                Billing Adjustments
              </p>
              {entries.map(e => (
                <div key={e.id} className="flex items-center justify-between py-3 border-b border-gray-50">
                  <span className="text-sm text-gray-500 font-inter">
                    {e.title}
                    <span className="ml-2 text-[10px] text-gray-400 uppercase tracking-wider">
                      {e.type === 'charge' ? 'Charge' : e.type === 'discount' ? 'Discount' : 'Payment'}
                    </span>
                  </span>
                  <span className={`text-sm font-semibold font-manrope ${
                    e.type === 'charge' ? 'text-red-500' : 'text-emerald-600'
                  }`}>
                    {e.type === 'charge' ? '+' : '-'}{fmt(e.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Pending Amount */}
          <div className="flex items-center justify-between py-4 mt-2 border-t-2 border-gray-200">
            <span className="text-sm font-bold text-gray-900 font-manrope">Pending Amount</span>
            <span className="text-xl font-black text-[#34088f] font-manrope">
              {isPaid ? 'Paid in Full' : fmt(pendingAmt)}
            </span>
          </div>
        </div>

        {/* Receipt row */}
        {receiptDoc && (
          <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
            <span className="text-sm text-gray-600 font-inter">Submitted Receipt</span>
            <div className="flex items-center gap-3">
              <a href={`/api/documents/${receiptDoc.id}/view`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#34088f] hover:text-[#2a0673] transition-colors">
                <Eye className="w-3.5 h-3.5" /> View
              </a>
              <a href={`/api/documents/${receiptDoc.id}/view?download=1`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors">
                <Download className="w-3.5 h-3.5" /> Download
              </a>
            </div>
          </div>
        )}
      </div>

      {/* ── Payment Methods (only when not fully paid; hidden for read-only B2B) ── */}
      {!readOnly && !isPaid && (
        <Card title="Complete Payment" icon={DollarSign}>
          {result && (
            <div className={`mb-5 p-3 rounded-xl text-xs font-inter ${
              result.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                : 'bg-red-50 border border-red-200 text-red-600'
            }`}>{result.msg}</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {/* PKR — Meezan Bank */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-black text-gray-900 font-manrope">PKR — Bank Transfer</p>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase tracking-wider">Active</span>
              </div>
              <div className="rounded-xl bg-gray-50 p-4 space-y-2 text-xs font-inter">
                {[
                  { label: 'Bank',      value: 'Meezan Bank' },
                  { label: 'Acc Title', value: 'SYED ABDULLAH BUKHARI' },
                  { label: 'Acc No',    value: '00300112453884' },
                  { label: 'IBAN',      value: 'PK74MEZN0000300112453884' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-start justify-between gap-2">
                    <span className="text-gray-400 flex-shrink-0 w-20">{label}</span>
                    <span className="text-gray-800 font-medium text-right select-all">{value}</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs text-gray-500 font-inter mb-3">
                  Transfer the pending amount and upload your bank receipt below.
                </p>
                <label className="cursor-pointer block">
                  <div className={`flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-xs font-semibold border transition-colors ${
                    uploading ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' : 'bg-[#34088f] text-white hover:bg-[#2a0673] border-transparent'
                  }`}>
                    {uploading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...</> : <><Upload className="w-3.5 h-3.5" /> Upload Receipt</>}
                  </div>
                  <input type="file" className="hidden" accept="image/*,.pdf" disabled={uploading}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleReceiptUpload(f); }} />
                </label>
              </div>
            </div>

            {/* USD */}
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 shadow-sm flex flex-col items-center justify-center gap-3 min-h-[200px]">
              <DollarSign className="w-8 h-8 text-gray-300" />
              <p className="text-sm font-black text-gray-700 font-manrope">USD — Bank Transfer</p>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 uppercase tracking-wider">Coming Soon</span>
            </div>

            {/* GBP */}
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 shadow-sm flex flex-col items-center justify-center gap-3 min-h-[200px]">
              <span className="text-2xl text-gray-300 font-bold">£</span>
              <p className="text-sm font-black text-gray-700 font-manrope">GBP — Bank Transfer</p>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 uppercase tracking-wider">Coming Soon</span>
            </div>
          </div>

          {/* Card payment — disabled */}
          <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-5 flex flex-col sm:flex-row items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gray-200 flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-5 h-5 text-gray-400" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <p className="text-sm font-bold text-gray-500 font-manrope">Card Payment</p>
              <p className="text-xs text-gray-400 font-inter mt-0.5">Online card payments will be available soon.</p>
            </div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 uppercase tracking-wider flex-shrink-0">Coming Soon</span>
          </div>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: ADD-ONS
// ═══════════════════════════════════════════════════════════════════════════

const ADDON_STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending:    { label: 'Pending',    cls: 'bg-amber-100 text-amber-700' },
  in_process: { label: 'In Process', cls: 'bg-blue-100 text-blue-700' },
  completed:  { label: 'Completed',  cls: 'bg-emerald-100 text-emerald-700' },
  failed:     { label: 'Failed',     cls: 'bg-red-100 text-red-700' },
};

function AddonStatusBadge({ status }: { status?: string }) {
  const cfg = status ? (ADDON_STATUS_MAP[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' }) : ADDON_STATUS_MAP['pending'];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-manrope ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function AddonsTab({ llc }: { llc: OrderDetail }) {
  const addons = llc.addonsSnapshot || [];

  if (addons.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 text-center">
        <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500 font-inter">No add-ons selected for this order.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {addons.map((addon, i) => {
        const r       = addon as Record<string, any>;
        const name    = r.name    || r.title       || 'Add-on';
        const price   = Number(r.price   || 0);
        const status  = r.status  || 'pending';
        const details = r.details || r.description || r.desc || null;
        const features: string[] = Array.isArray(r.features) ? r.features : [];

        return (
          <div key={i} className="flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header: name + status */}
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-sm font-bold text-gray-900 font-manrope leading-snug">{name}</p>
                <AddonStatusBadge status={status} />
              </div>
              <span className="text-lg font-black text-[#34088f] font-manrope">
                ${price.toLocaleString()}
              </span>
            </div>

            {/* Body: features + admin notes */}
            <div className="flex-1 px-5 py-4 space-y-3">
              {features.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-manrope mb-1">Includes</p>
                  <ul className="space-y-1">
                    {features.map((f, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 text-xs text-gray-600 font-inter">
                        <Check className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {details ? (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-manrope mb-1">Notes</p>
                  <p className="text-sm text-gray-700 font-inter">{details}</p>
                </div>
              ) : features.length === 0 ? (
                <p className="text-xs text-gray-400 font-inter italic">No additional notes.</p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
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
