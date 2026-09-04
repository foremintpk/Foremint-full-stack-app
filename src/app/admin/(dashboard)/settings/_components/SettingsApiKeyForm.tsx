/**
 * @file src/app/admin/(dashboard)/settings/_components/SettingsApiKeyForm.tsx
 * @description Document-reading API key, managed from Settings.
 *
 * The same key the EIN section uses — this is a second place to reach it, not a
 * second key. It is stored in the ss4_settings row rather than an env var so it
 * can be rotated without a redeploy, and it is never sent back to the browser:
 * the field shows only whether one is installed and its last four characters.
 *
 * 1. Server vs Client choice rationale: Client Component — it posts to the
 *    settings route and reflects the result inline.
 * 2. Caching layer: none; the fetch is no-store.
 * 3. RBAC: administrator only. Rendered behind that check on the page, and the
 *    API route re-checks.
 * 4. Revalidation: N/A — the value is read live wherever it is used.
 */

'use client';

import React, { useState } from 'react';
import { Check, Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react';

interface SettingsApiKeyFormProps {
  /** Whether a key is already stored. */
  hasKey: boolean;
  /** Last four characters of the stored key, for identification. */
  keyHint: string | null;
  model: string;
}

export function SettingsApiKeyForm({
  hasKey,
  keyHint,
  model,
}: SettingsApiKeyFormProps): React.JSX.Element {
  const [installed, setInstalled] = useState(hasKey);
  const [hint, setHint] = useState(keyHint);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const value = apiKey.trim();
    if (!value) return;

    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch('/api/admin/ss4/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visionApiKey: value }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Could not save the key.');
        return;
      }

      setInstalled(data.hasVisionKey);
      setHint(data.visionKeyHint);
      // Never leave the secret sitting in the DOM after a successful save.
      setApiKey('');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError('Could not reach the server.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-[#e0d9f7] rounded-2xl shadow-[0_1px_4px_rgba(52,8,143,0.06)] p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="inline-flex items-center justify-center w-9 h-9 bg-[#f4f0fe] text-[#34088f] rounded-lg border border-[#e0d9f7]">
            <KeyRound size={16} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900 font-manrope">Document reading API key</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Reads filings the local parser cannot, such as scanned documents.
            </p>
          </div>
        </div>

        {installed && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-[#065f46] bg-[#d1fae5] border border-[#a7f3d0] rounded whitespace-nowrap">
            Installed {hint}
          </span>
        )}
      </div>

      {error && <p className="text-xs text-[#991b1b]">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            disabled={saving}
            autoComplete="off"
            spellCheck={false}
            placeholder={installed ? 'Enter a new key to replace the current one' : 'Paste the API key'}
            className="w-full px-3 py-2 pr-9 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#34088f]/20 focus:border-[#34088f] disabled:bg-gray-50"
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            aria-label={showKey ? 'Hide key' : 'Show key'}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <button
          onClick={save}
          disabled={saving || !apiKey.trim()}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#34088f] rounded-lg hover:bg-[#2a0673] disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          {saving ? 'Saving…' : 'Save key'}
        </button>

        {saved && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#065f46]">
            <Check className="w-3.5 h-3.5" />
            Saved
          </span>
        )}
      </div>

      <p className="text-[11px] text-gray-400 leading-relaxed">
        Model: <span className="font-mono">{model}</span>. The stored key is never shown again —
        only the last four characters, so you can tell which key is installed. Also editable under{' '}
        <span className="font-semibold text-gray-500">EIN</span>; both places manage the same key.
      </p>
    </div>
  );
}
