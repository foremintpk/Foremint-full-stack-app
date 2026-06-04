'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Edit2, Save, X, Building, FileSignature, MapPin, Info } from 'lucide-react';
import { updateFormationInfo } from '@/lib/admin/actions/updateFormationInfo';
import { updateFormationDetails } from '@/lib/admin/actions/updateFormationDetails';
import { US_STATES } from '@/lib/onboarding-data';
import type { OrderDetail, Package } from '@/types/admin';

interface FormationDetailsTabProps {
  order: OrderDetail;
  internalData: any;
  packages: Package[];
  adminId: string;
  onSaved: () => void;
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100">
        <div className="w-8 h-8 rounded-lg bg-[#34088f]/5 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-[#34088f]" />
        </div>
        <h3 className="text-sm font-black text-gray-900 font-manrope">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function ReadField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-inter">{label}</span>
      <span className="text-sm font-semibold text-gray-900 font-inter">{value || <span className="text-gray-300 italic font-normal text-xs">—</span>}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-inter">{label}</label>
      {children}
    </div>
  );
}

const INPUT_CLS = 'block w-full h-10 px-4 bg-white border border-[#e5e7eb] rounded-full text-xs font-semibold font-inter outline-none focus:border-[#34088f] transition-all';
const SELECT_CLS = 'block w-full h-10 pl-4 pr-10 bg-white border border-[#e5e7eb] rounded-full text-xs font-semibold font-inter outline-none focus:border-[#34088f] transition-all appearance-none';
const TEXTAREA_CLS = 'block w-full px-4 py-3 bg-white border border-[#e5e7eb] rounded-xl text-xs font-semibold font-inter outline-none focus:border-[#34088f] transition-all resize-none';

export function FormationDetailsTab({
  order, internalData, packages, adminId, onSaved,
}: FormationDetailsTabProps) {
  const snapshot = (order.formSnapshot as any) || {};
  const fd = internalData?.formationDetails;

  // ── Business Info state ─────────────────────────────────────────────────────
  const [editBusiness, setEditBusiness] = useState(false);
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [businessError, setBusinessError] = useState<string | null>(null);

  const [businessName, setBusinessName] = useState('');
  const [secondaryName, setSecondaryName] = useState('');
  const [website, setWebsite] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [entityType, setEntityType] = useState('');
  const [memberType, setMemberType] = useState('');
  const [formationState, setFormationState] = useState('');
  const [formationPackage, setFormationPackage] = useState('');

  const loadBusiness = useCallback(() => {
    const s = snapshot;
    setBusinessName(s?.step3?.businessName ?? s?.businessName ?? '');
    setSecondaryName(s?.step3?.secondaryBusinessName ?? s?.secondaryBusinessName ?? '');
    setWebsite(s?.step3?.businessWebsite ?? s?.businessWebsite ?? '');
    setCategory(s?.step3?.businessCategory ?? s?.businessCategory ?? '');
    setDescription(s?.step3?.businessDescription ?? s?.businessDescription ?? '');
    setEntityType(order.entityType ?? 'us-llc');
    setMemberType(order.memberType ?? 'single-member');
    setFormationState(order.formationState ?? 'WY');
    setFormationPackage(order.formationPackage ?? '');
  }, [snapshot, order]);

  useEffect(() => { loadBusiness(); }, [loadBusiness]);

  const handleSaveBusiness = async () => {
    setSavingBusiness(true); setBusinessError(null);
    const res = await updateFormationInfo(order.id, {
      businessName, secondaryBusinessName: secondaryName, businessWebsite: website,
      businessCategory: category, businessDescription: description,
      entityType, memberType, formationState, formationPackage,
    });
    setSavingBusiness(false);
    if (res.success) { setEditBusiness(false); onSaved(); }
    else setBusinessError(res.error ?? 'Save failed');
  };

  // ── Filing Info state ────────────────────────────────────────────────────────
  const [editFiling, setEditFiling] = useState(false);
  const [savingFiling, setSavingFiling] = useState(false);
  const [filingError, setFilingError] = useState<string | null>(null);

  const [ein, setEin] = useState(fd?.einNumber ?? '');
  const [filingId, setFilingId] = useState(fd?.filingId ?? '');
  const [formationDate, setFormationDate] = useState(fd?.formationDate ?? '');
  const [renewalDate, setRenewalDate] = useState(fd?.stateRenewalDate ?? '');
  const [renewalFee, setRenewalFee] = useState(fd?.stateRenewalFees != null ? String(fd.stateRenewalFees) : '');

  useEffect(() => {
    setEin(fd?.einNumber ?? '');
    setFilingId(fd?.filingId ?? '');
    setFormationDate(fd?.formationDate ?? '');
    setRenewalDate(fd?.stateRenewalDate ?? '');
    setRenewalFee(fd?.stateRenewalFees != null ? String(fd.stateRenewalFees) : '');
  }, [fd]);

  // ── Address state ────────────────────────────────────────────────────────────
  const addrToText = (a: any): string => {
    if (!a) return '';
    if (typeof a === 'string') return a;
    const parts = [a.street, a.city, a.state, a.zip, a.country].filter(Boolean);
    return parts.join(', ');
  };

  const [businessAddr, setBusinessAddr] = useState('');
  const [mailingAddr, setMailingAddr] = useState('');
  const [tradingAddr, setTradingAddr] = useState('');

  useEffect(() => {
    setBusinessAddr(addrToText(fd?.businessAddress));
    setMailingAddr(addrToText(fd?.mailingAddress));
    setTradingAddr(addrToText(fd?.tradingAddress));
  }, [fd]);

  const handleSaveFiling = async () => {
    setSavingFiling(true); setFilingError(null);
    const res = await updateFormationDetails(order.id, adminId, {
      einNumber: ein || null,
      filingId: filingId || null,
      formationDate: formationDate || null,
      stateRenewalDate: renewalDate || null,
      stateRenewalFees: renewalFee ? Number(renewalFee) : null,
      businessAddress: businessAddr ? { street: businessAddr, city: '', state: '', zip: '', country: '' } : null,
      mailingAddress:  mailingAddr  ? { street: mailingAddr,  city: '', state: '', zip: '', country: '' } : null,
      tradingAddress:  tradingAddr  ? { street: tradingAddr,  city: '', state: '', zip: '', country: '' } : null,
    });
    setSavingFiling(false);
    if (res.success) { setEditFiling(false); onSaved(); }
    else setFilingError(res.error ?? 'Save failed');
  };

  const EditToggle = ({ editing, onEdit, onSave, onCancel, saving, error }: {
    editing: boolean; onEdit: () => void; onSave: () => void; onCancel: () => void; saving: boolean; error?: string | null;
  }) => (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-red-600 font-semibold font-inter">{error}</span>}
      {!editing ? (
        <button onClick={onEdit} className="flex items-center gap-1.5 px-4 py-2 border border-[#e5e7eb] rounded-full text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all font-manrope">
          <Edit2 className="w-3.5 h-3.5 text-gray-500" /> Edit
        </button>
      ) : (
        <>
          <button onClick={onSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-[#34088f] text-white rounded-full text-xs font-bold hover:bg-[#2d077c] disabled:opacity-50 transition-all font-manrope">
            <Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save'}
          </button>
          <button onClick={onCancel} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 border border-[#e5e7eb] rounded-full text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all font-manrope">
            <X className="w-3.5 h-3.5" /> Cancel
          </button>
        </>
      )}
    </div>
  );

  const entityLabel = (t: string) => t === 'us-llc' || t === 'us_llc' ? 'US LLC' : t === 'uk-ltd' || t === 'uk_ltd' ? 'UK LTD' : t;
  const memberLabel = (m: string) => m === 'single-member' || m === 'single' ? 'Single-member' : m === 'multi-member' || m === 'multi' ? 'Multi-member' : m;
  const packageLabel = (id: string) => packages.find(p => p.id === id)?.name ?? id ?? '—';
  const stateLabel = (code: string) => US_STATES.find(s => s.abbreviation === code)?.name ?? code;

  return (
    <div className="space-y-5">
      {/* ── Business Information ──────────────────────────────────── */}
      <SectionCard title="Business Information" icon={Info}>
        <div className="flex items-center justify-between mb-5">
          <p className="text-xs text-gray-400 font-inter">From onboarding form — editable by admin</p>
          <EditToggle editing={editBusiness} onEdit={() => setEditBusiness(true)} onSave={handleSaveBusiness}
            onCancel={() => { loadBusiness(); setEditBusiness(false); setBusinessError(null); }}
            saving={savingBusiness} error={businessError} />
        </div>

        {!editBusiness ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <ReadField label="LLC Name"              value={businessName} />
            <ReadField label="Secondary Name"        value={secondaryName} />
            <ReadField label="Business Website"      value={website} />
            <ReadField label="Business Category"     value={category} />
            <ReadField label="Entity Type"           value={entityLabel(entityType)} />
            <ReadField label="Member Type"           value={memberLabel(memberType)} />
            <ReadField label="Formation State"       value={stateLabel(formationState)} />
            <ReadField label="Package"               value={packageLabel(formationPackage)} />
            <div className="md:col-span-2 lg:col-span-3">
              <ReadField label="Business Description" value={description} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="LLC Name"><input className={INPUT_CLS} value={businessName} onChange={e => setBusinessName(e.target.value)} /></Field>
            <Field label="Secondary Name"><input className={INPUT_CLS} value={secondaryName} onChange={e => setSecondaryName(e.target.value)} /></Field>
            <Field label="Business Website"><input className={INPUT_CLS} type="url" value={website} onChange={e => setWebsite(e.target.value)} /></Field>
            <Field label="Business Category"><input className={INPUT_CLS} value={category} onChange={e => setCategory(e.target.value)} /></Field>
            <Field label="Entity Type">
              <div className="relative">
                <select className={SELECT_CLS} value={entityType} onChange={e => setEntityType(e.target.value)}>
                  <option value="us-llc">US LLC</option>
                  <option value="uk-ltd">UK LTD</option>
                </select>
              </div>
            </Field>
            <Field label="Member Type">
              <div className="relative">
                <select className={SELECT_CLS} value={memberType} onChange={e => setMemberType(e.target.value)}>
                  <option value="single-member">Single-member</option>
                  <option value="multi-member">Multi-member</option>
                </select>
              </div>
            </Field>
            <Field label="Formation State">
              <div className="relative">
                <select className={SELECT_CLS} value={formationState} onChange={e => setFormationState(e.target.value)}>
                  {US_STATES.map(s => (
                    <option key={s.abbreviation} value={s.abbreviation}>{s.name} (${s.filingFee})</option>
                  ))}
                </select>
              </div>
            </Field>
            <Field label="Package">
              <div className="relative">
                <select className={SELECT_CLS} value={formationPackage} onChange={e => setFormationPackage(e.target.value)}>
                  <option value="">— None —</option>
                  {packages.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (${p.price})</option>
                  ))}
                </select>
              </div>
            </Field>
            <div className="md:col-span-2 lg:col-span-3">
              <Field label="Business Description">
                <textarea className={TEXTAREA_CLS} rows={3} value={description} onChange={e => setDescription(e.target.value)} />
              </Field>
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── Filing Information & Addresses ───────────────────────── */}
      <SectionCard title="Filing Information & Addresses" icon={FileSignature}>
        <div className="flex items-center justify-between mb-5">
          <p className="text-xs text-gray-400 font-inter">EIN, filing ID, formation dates, and company addresses</p>
          <EditToggle editing={editFiling} onEdit={() => setEditFiling(true)} onSave={handleSaveFiling}
            onCancel={() => {
              setEin(fd?.einNumber ?? ''); setFilingId(fd?.filingId ?? '');
              setFormationDate(fd?.formationDate ?? ''); setRenewalDate(fd?.stateRenewalDate ?? '');
              setRenewalFee(fd?.stateRenewalFees != null ? String(fd.stateRenewalFees) : '');
              setBusinessAddr(addrToText(fd?.businessAddress));
              setMailingAddr(addrToText(fd?.mailingAddress));
              setTradingAddr(addrToText(fd?.tradingAddress));
              setEditFiling(false); setFilingError(null);
            }}
            saving={savingFiling} error={filingError} />
        </div>

        {!editFiling ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <ReadField label="EIN Number"        value={ein} />
              <ReadField label="Filing ID"         value={filingId} />
              <ReadField label="Formation Date"    value={formationDate} />
              <ReadField label="Renewal Date"      value={renewalDate} />
              <ReadField label="Renewal Fee (PKR)" value={renewalFee ? `Rs. ${Number(renewalFee).toLocaleString()}` : undefined} />
            </div>
            <div className="border-t border-gray-100 pt-5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-4 font-inter">Addresses</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <ReadField label="Business Address" value={businessAddr} />
                <ReadField label="Mailing Address"  value={mailingAddr} />
                <ReadField label="Trading Address"  value={tradingAddr} />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="EIN Number"><input className={INPUT_CLS} placeholder="XX-XXXXXXX" value={ein} onChange={e => setEin(e.target.value)} /></Field>
              <Field label="Filing ID"><input className={INPUT_CLS} value={filingId} onChange={e => setFilingId(e.target.value)} /></Field>
              <Field label="Formation Date"><input className={INPUT_CLS} type="date" value={formationDate} onChange={e => setFormationDate(e.target.value)} /></Field>
              <Field label="Renewal Date"><input className={INPUT_CLS} type="date" value={renewalDate} onChange={e => setRenewalDate(e.target.value)} /></Field>
              <Field label="Renewal Fee (PKR)"><input className={INPUT_CLS} type="number" value={renewalFee} onChange={e => setRenewalFee(e.target.value)} /></Field>
            </div>
            <div className="border-t border-gray-100 pt-5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-4 font-inter">Addresses</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Business Address"><input className={INPUT_CLS} placeholder="Full address" value={businessAddr} onChange={e => setBusinessAddr(e.target.value)} /></Field>
                <Field label="Mailing Address"><input className={INPUT_CLS}  placeholder="Full address" value={mailingAddr}  onChange={e => setMailingAddr(e.target.value)} /></Field>
                <Field label="Trading Address"><input className={INPUT_CLS}  placeholder="Full address" value={tradingAddr}  onChange={e => setTradingAddr(e.target.value)} /></Field>
              </div>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
