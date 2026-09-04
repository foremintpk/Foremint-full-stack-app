/**
 * @file .../[orderId]/_components/ExtractFromDocuments.tsx
 * @description "Read from documents" panel for the Formation Details tab.
 *
 * Reads the order's Articles, EIN letter and order form, reconciles them, and
 * shows what each field would become — with the documents that agreed on it —
 * before anything is written.
 *
 * EVERY FIELD IS EDITABLE HERE. A field whose sources disagree is skipped by
 * default, and the only way to resolve it is to say which value is right; the
 * same edit box also lets a verified value be corrected when the documents are
 * confidently wrong. Edited values are sent as overrides and win over whatever
 * was read. These end up on filed federal forms, so a wrong EIN is worse than a
 * blank one — nothing is written until Apply.
 */

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileSearch,
  Loader2,
  Pencil,
  RotateCcw,
  ShieldCheck,
  ShieldQuestion,
  XCircle,
} from 'lucide-react';

type Confidence = 'verified' | 'single' | 'conflict' | 'missing';

interface ProfileField<T> {
  value: T | null;
  confidence: Confidence;
  sources: string[];
  alternatives?: { value: T; source: string }[];
  note?: string;
}

interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

interface Profile {
  orderNumber: string;
  companyName: ProfileField<string>;
  formationDate: ProfileField<string>;
  filingId: ProfileField<string>;
  ein: ProfileField<string>;
  stateOfFormation: ProfileField<string>;
  structure: ProfileField<string>;
  businessAddress: ProfileField<Address>;
  renewalDate: ProfileField<string>;
  renewalFee: ProfileField<number>;
  readLog: { document: string; status: string; detail: string }[];
  safeToApply: boolean;
}

/** Keys the operator can override, matching ProfileOverrides on the server. */
type EditableKey =
  | 'companyName'
  | 'formationDate'
  | 'filingId'
  | 'ein'
  | 'stateOfFormation'
  | 'structure'
  | 'businessAddress';

interface ExtractFromDocumentsProps {
  orderNumber: string;
}

const CONFIDENCE_UI: Record<
  Confidence,
  { label: string; bg: string; text: string; border: string; Icon: typeof ShieldCheck }
> = {
  verified: { label: 'Verified', bg: 'bg-[#d1fae5]', text: 'text-[#065f46]', border: 'border-[#a7f3d0]', Icon: ShieldCheck },
  single:   { label: 'One source', bg: 'bg-[#dbeafe]', text: 'text-[#1e40af]', border: 'border-[#bfdbfe]', Icon: ShieldQuestion },
  conflict: { label: 'Conflict', bg: 'bg-[#fef3c7]', text: 'text-[#92400e]', border: 'border-[#fde68a]', Icon: AlertTriangle },
  missing:  { label: 'Not found', bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200', Icon: XCircle },
};

const fmtAddress = (a: Address | null): string =>
  a ? [a.street, a.city, a.state, a.zip].filter(Boolean).join(', ') : '';

/** "30 N Gould St, Sheridan, WY, 82801" back into its parts. */
function parseAddress(text: string): Address | null {
  const parts = text.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length < 4) return null;
  const [zip, state, city, ...streetParts] = [...parts].reverse();
  return {
    street: streetParts.reverse().join(', '),
    city,
    state: state.toUpperCase(),
    zip,
    country: 'USA',
  };
}

export default function ExtractFromDocuments({
  orderNumber,
}: ExtractFromDocumentsProps): React.JSX.Element {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reading, setReading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState<string[] | null>(null);

  /** Operator edits, keyed by field. Absent means "use what was read". */
  const [edits, setEdits] = useState<Partial<Record<EditableKey, string>>>({});
  const [editing, setEditing] = useState<Set<EditableKey>>(new Set());

  // A fresh read discards edits made against the previous one.
  useEffect(() => {
    setEdits({});
    setEditing(new Set());
  }, [profile]);

  const read = async () => {
    setReading(true);
    setError(null);
    setApplied(null);
    try {
      const res = await fetch(
        `/api/admin/ss4/extract-profile?orderNumber=${encodeURIComponent(orderNumber)}`,
        { cache: 'no-store' }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not read the documents.');
        return;
      }
      setProfile(data);
    } catch {
      setError('Could not reach the server.');
    } finally {
      setReading(false);
    }
  };

  const rows = useMemo(() => {
    if (!profile) return [];
    return [
      { key: 'companyName' as const, label: 'Company name', field: profile.companyName, display: profile.companyName.value ?? '' },
      { key: 'formationDate' as const, label: 'Formation date', field: profile.formationDate, display: profile.formationDate.value ?? '' },
      { key: 'filingId' as const, label: 'Filing ID', field: profile.filingId, display: profile.filingId.value ?? '' },
      { key: 'ein' as const, label: 'EIN', field: profile.ein, display: profile.ein.value ?? '' },
      { key: 'stateOfFormation' as const, label: 'State', field: profile.stateOfFormation, display: profile.stateOfFormation.value ?? '' },
      {
        key: 'structure' as const,
        label: 'Structure',
        field: profile.structure,
        display: profile.structure.value ?? '',
      },
      { key: 'businessAddress' as const, label: 'Address', field: profile.businessAddress, display: fmtAddress(profile.businessAddress.value as Address | null) },
    ];
  }, [profile]);

  /** Fields that will actually be written on Apply. */
  const writableCount = useMemo(() => {
    return rows.filter((r) => {
      const edited = edits[r.key]?.trim();
      if (edited) return true;
      return r.field.confidence === 'verified' || r.field.confidence === 'single';
    }).length;
  }, [rows, edits]);

  const unresolvedConflicts = rows.filter(
    (r) => r.field.confidence === 'conflict' && !edits[r.key]?.trim()
  );

  const apply = async () => {
    setApplying(true);
    setError(null);
    try {
      // Only send fields the operator actually changed; everything else is
      // resolved server-side from a freshly rebuilt profile.
      const overrides: Record<string, unknown> = {};
      for (const [key, raw] of Object.entries(edits)) {
        const value = raw?.trim();
        if (!value) continue;
        if (key === 'businessAddress') {
          const parsed = parseAddress(value);
          if (!parsed) {
            setError('Address must read: street, city, STATE, zip.');
            setApplying(false);
            return;
          }
          overrides.businessAddress = parsed;
        } else if (key === 'structure') {
          overrides.structure = /multi/i.test(value) ? 'multi_member_llc' : 'single_member_llc';
        } else {
          overrides[key] = value;
        }
      }

      const res = await fetch('/api/admin/ss4/extract-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber, overrides }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not apply the values.');
        return;
      }
      setApplied(Object.keys(data.applied ?? {}));
      // Reflect the newly written values on the page behind this panel.
      setTimeout(() => window.location.reload(), 1200);
    } catch {
      setError('Could not reach the server.');
    } finally {
      setApplying(false);
    }
  };

  const startEdit = (key: EditableKey, current: string) => {
    setEdits((e) => ({ ...e, [key]: e[key] ?? current }));
    setEditing((s) => new Set(s).add(key));
  };

  const cancelEdit = (key: EditableKey) => {
    setEdits((e) => {
      const next = { ...e };
      delete next[key];
      return next;
    });
    setEditing((s) => {
      const next = new Set(s);
      next.delete(key);
      return next;
    });
  };

  return (
    <div className="p-4 bg-white border border-gray-200 rounded-xl space-y-4 font-inter">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-gray-900 font-manrope">Read from documents</h3>
          <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed max-w-lg">
            Reads this order&apos;s Articles, EIN letter and order form, then cross-checks them
            against each other. Every value can be corrected before saving; nothing is saved until
            you apply it.
          </p>
        </div>
        <button
          onClick={read}
          disabled={reading || applying}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#34088f] rounded-lg hover:bg-[#2a0673] disabled:opacity-50 transition"
        >
          {reading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSearch className="w-3.5 h-3.5" />}
          {reading ? 'Reading…' : profile ? 'Read again' : 'Read documents'}
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 p-3 bg-[#fee2e2] border border-[#fecaca] rounded-lg">
          <AlertTriangle className="w-4 h-4 text-[#991b1b] mt-0.5 flex-shrink-0" />
          <p className="text-xs text-[#991b1b] leading-relaxed">{error}</p>
        </div>
      )}

      {applied && (
        <div className="flex items-start gap-2.5 p-3 bg-[#d1fae5] border border-[#a7f3d0] rounded-lg">
          <CheckCircle2 className="w-4 h-4 text-[#065f46] mt-0.5 flex-shrink-0" />
          <p className="text-xs text-[#065f46] leading-relaxed">
            Saved {applied.length} field{applied.length === 1 ? '' : 's'}. Refreshing…
          </p>
        </div>
      )}

      {profile && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px]">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Field', 'Value', 'Confidence', 'Sources'].map((h) => (
                    <th key={h} className="px-2 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const isEditing = editing.has(r.key);
                  const edited = edits[r.key];
                  const wasEdited = Boolean(edited?.trim()) && edited !== r.display;
                  const ui = CONFIDENCE_UI[wasEdited ? 'verified' : r.field.confidence];

                  return (
                    <tr key={r.key} className="border-b border-gray-50 last:border-0 align-top">
                      <td className="px-2 py-2.5 text-xs font-semibold text-gray-700 whitespace-nowrap">
                        {r.label}
                      </td>

                      <td className="px-2 py-2.5 text-xs text-gray-900 max-w-[300px]">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            {r.key === 'structure' ? (
                              <select
                                value={edited ?? ''}
                                onChange={(e) => setEdits((s) => ({ ...s, [r.key]: e.target.value }))}
                                className="flex-1 px-2 py-1 text-xs border border-[#34088f] rounded focus:outline-none focus:ring-2 focus:ring-[#34088f]/20"
                              >
                                <option value="single_member_llc">Single-member</option>
                                <option value="multi_member_llc">Multi-member</option>
                              </select>
                            ) : (
                              <input
                                value={edited ?? ''}
                                onChange={(e) => setEdits((s) => ({ ...s, [r.key]: e.target.value }))}
                                autoFocus
                                placeholder={
                                  r.key === 'businessAddress'
                                    ? 'street, city, STATE, zip'
                                    : r.key === 'formationDate'
                                      ? 'YYYY-MM-DD'
                                      : undefined
                                }
                                className="flex-1 px-2 py-1 text-xs border border-[#34088f] rounded focus:outline-none focus:ring-2 focus:ring-[#34088f]/20"
                              />
                            )}
                            <button
                              onClick={() => cancelEdit(r.key)}
                              aria-label={`Undo ${r.label}`}
                              title="Discard this edit"
                              className="p-1 text-gray-400 hover:text-gray-700 rounded"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(r.key, r.display)}
                            className="group flex items-start gap-1.5 text-left w-full"
                          >
                            <span className={`break-words ${r.display ? '' : 'text-gray-400 italic'}`}>
                              {r.key === 'structure' && r.display
                                ? r.display === 'multi_member_llc' ? 'Multi-member' : 'Single-member'
                                : r.display || 'not found — click to enter'}
                            </span>
                            <Pencil className="w-3 h-3 mt-0.5 text-gray-300 group-hover:text-[#34088f] flex-shrink-0" />
                          </button>
                        )}

                        {r.field.confidence === 'conflict' && !wasEdited && r.field.note && (
                          <div className="text-[11px] text-[#92400e] mt-1.5 leading-snug">
                            {r.field.note}
                            {r.field.alternatives?.length ? (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {[
                                  { value: r.display, source: r.field.sources[0] ?? 'read' },
                                  ...r.field.alternatives.map((a) => ({
                                    value: typeof a.value === 'object' ? fmtAddress(a.value as Address) : String(a.value),
                                    source: a.source,
                                  })),
                                ].map((opt) => (
                                  <button
                                    key={opt.source + opt.value}
                                    onClick={() => {
                                      setEdits((s) => ({ ...s, [r.key]: opt.value }));
                                      setEditing((s) => new Set(s).add(r.key));
                                    }}
                                    className="px-1.5 py-0.5 text-[10px] font-semibold bg-white border border-[#fde68a] rounded hover:bg-[#fffbeb] transition"
                                  >
                                    use {opt.source}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        )}
                      </td>

                      <td className="px-2 py-2.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded border ${ui.bg} ${ui.text} ${ui.border}`}>
                          <ui.Icon className="w-3 h-3" />
                          {wasEdited ? 'Edited' : ui.label}
                        </span>
                      </td>

                      <td className="px-2 py-2.5 text-[11px] text-gray-500">
                        {wasEdited ? 'you' : r.field.sources.length ? r.field.sources.join(', ') : '—'}
                      </td>
                    </tr>
                  );
                })}

                {/* Derived from the state fee table, not from any document. */}
                {[
                  { label: 'Renewal date', field: profile.renewalDate, display: profile.renewalDate.value ?? '—' },
                  {
                    label: 'Renewal fee',
                    field: profile.renewalFee,
                    display: profile.renewalFee.value !== null ? `$${profile.renewalFee.value}` : '—',
                  },
                ].map((r) => {
                  const ui = CONFIDENCE_UI[r.field.confidence];
                  return (
                    <tr key={r.label} className="border-b border-gray-50 last:border-0">
                      <td className="px-2 py-2 text-xs font-semibold text-gray-700 whitespace-nowrap">{r.label}</td>
                      <td className="px-2 py-2 text-xs text-gray-900">{r.display}</td>
                      <td className="px-2 py-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded border ${ui.bg} ${ui.text} ${ui.border}`}>
                          <ui.Icon className="w-3 h-3" />
                          {ui.label}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-[11px] text-gray-500">
                        {r.field.sources.join(', ') || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* What was read, and what could not be */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2 border-t border-gray-100">
            {profile.readLog.map((l) => (
              <span
                key={l.document}
                className={`text-[11px] ${
                  l.status === 'ok' ? 'text-gray-500' : l.status === 'failed' ? 'text-[#991b1b]' : 'text-gray-400'
                }`}
                title={l.detail}
              >
                {l.document}: {l.status === 'ok' ? 'read' : l.status}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100">
            <p className="text-[11px] text-gray-500 max-w-md leading-relaxed">
              {unresolvedConflicts.length > 0 ? (
                <span className="text-[#92400e]">
                  {unresolvedConflicts.length} field{unresolvedConflicts.length === 1 ? '' : 's'} still
                  in conflict and will be skipped — pick a value above to include{' '}
                  {unresolvedConflicts.length === 1 ? 'it' : 'them'}.
                </span>
              ) : (
                <>Click any value to correct it before saving.</>
              )}
            </p>
            <button
              onClick={apply}
              disabled={applying || writableCount === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#34088f] rounded-lg hover:bg-[#2a0673] disabled:opacity-40 transition"
            >
              {applying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Apply {writableCount > 0 ? `${writableCount} field${writableCount === 1 ? '' : 's'}` : ''}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
