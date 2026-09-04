/**
 * @file src/app/admin/(dashboard)/ein/_components/TemplateManager.tsx
 * @description Sample SS-4 template library — view, upload, activate, delete.
 *
 * The attempt banner is drawn at fixed geometry measured from the original IRS
 * form, so a differently laid-out template will place it wrongly. That is why
 * activation is explicit and reversible rather than automatic on upload.
 */

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ExternalLink, Loader2, Trash2, Upload } from 'lucide-react';

interface TemplateRow {
  id: string;
  name: string;
  variant: 'single' | 'multi';
  document_url: string;
  file_name: string | null;
  file_size: number | null;
  is_active: boolean;
  created_at: string;
}

export default function TemplateManager(): React.JSX.Element {
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [variant, setVariant] = useState<'single' | 'multi'>('single');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/ss4/templates', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) setTemplates(data.templates ?? []);
      else setError(data.error ?? 'Could not load templates.');
    } catch {
      setError('Could not load templates.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const upload = async () => {
    if (!file) return;
    setBusy('upload');
    setError(null);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('name', name || file.name);
      body.append('variant', variant);

      const res = await fetch('/api/admin/ss4/templates', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Upload failed.');
        return;
      }
      setFile(null);
      setName('');
      await load();
    } catch {
      setError('Upload failed.');
    } finally {
      setBusy(null);
    }
  };

  const setActive = async (id: string, isActive: boolean) => {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch('/api/admin/ss4/templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive }),
      });
      if (!res.ok) setError((await res.json()).error ?? 'Could not update.');
      else await load();
    } finally {
      setBusy(null);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this template permanently?')) return;
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/ss4/templates?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) setError((await res.json()).error ?? 'Could not delete.');
      else await load();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="p-4 bg-white border border-gray-200 rounded-xl space-y-4">
      <div>
        <h2 className="text-sm font-bold text-gray-900 font-manrope">SS-4 templates</h2>
        <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
          An active template replaces the bundled form for its variant. Leave both inactive to use
          the bundled IRS SS-4.
        </p>
      </div>

      {error && <p className="text-xs text-[#991b1b]">{error}</p>}

      {/* Upload */}
      <div className="flex flex-wrap items-end gap-2 p-3 bg-gray-50 rounded-lg">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">File</span>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-xs file:mr-2 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:border-0 file:rounded-md file:bg-white file:text-[#34088f] file:border file:border-gray-200"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Label</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Optional"
            className="w-40 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#34088f]/20 focus:border-[#34088f]"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Variant</span>
          <select
            value={variant}
            onChange={(e) => setVariant(e.target.value as 'single' | 'multi')}
            className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#34088f]/20 focus:border-[#34088f]"
          >
            <option value="single">Single-member</option>
            <option value="multi">Multi-member</option>
          </select>
        </label>

        <button
          onClick={upload}
          disabled={!file || busy === 'upload'}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#34088f] rounded-lg hover:bg-[#2a0673] disabled:opacity-40 transition"
        >
          {busy === 'upload' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          Upload
        </button>
      </div>

      {/* List */}
      {loading ? (
        <p className="text-xs text-gray-400 py-3">Loading templates…</p>
      ) : templates.length === 0 ? (
        <p className="text-xs text-gray-500 py-3">
          No uploaded templates. The bundled IRS SS-4 is in use.
        </p>
      ) : (
        <div className="divide-y divide-gray-100">
          {templates.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center gap-3 py-2.5">
              <div className="flex-1 min-w-[180px]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-900 truncate">{t.name}</span>
                  {t.is_active && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold text-[#065f46] bg-[#d1fae5] border border-[#a7f3d0] rounded">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      Active
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-gray-400">
                  {t.variant === 'multi' ? 'Multi-member' : 'Single-member'}
                  {t.file_size ? ` · ${(t.file_size / 1024).toFixed(0)} KB` : ''}
                </span>
              </div>

              <a
                href={t.document_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#34088f] hover:underline"
              >
                View <ExternalLink className="w-3 h-3" />
              </a>

              <button
                onClick={() => setActive(t.id, !t.is_active)}
                disabled={busy === t.id}
                className="px-2.5 py-1 text-[11px] font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition"
              >
                {t.is_active ? 'Deactivate' : 'Use this'}
              </button>

              <button
                onClick={() => remove(t.id)}
                disabled={busy === t.id}
                aria-label={`Delete ${t.name}`}
                className="p-1.5 text-gray-400 hover:text-[#991b1b] hover:bg-red-50 rounded-lg disabled:opacity-40 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
