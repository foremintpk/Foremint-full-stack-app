/**
 * @file src/app/admin/(dashboard)/ein/_components/AutomationBar.tsx
 * @description Automatic/manual toggle, schedule configuration and the vision
 * API key field.
 *
 * The schedule is stored in the database rather than vercel.json because
 * Vercel's cron entries are fixed at deploy time. An hourly tick reads this row
 * and decides whether a run is due, which is what makes these controls take
 * effect without a redeploy.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { Check, Clock, Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react';
import type { Ss4SettingsPublic } from '@/lib/services/ss4/settings';

interface AutomationBarProps {
  initialSettings: Ss4SettingsPublic;
  visionModel: string;
  disabled: boolean;
}

const DAYS = [
  { value: 0, label: 'Sun', full: 'Sunday' },
  { value: 1, label: 'Mon', full: 'Monday' },
  { value: 2, label: 'Tue', full: 'Tuesday' },
  { value: 3, label: 'Wed', full: 'Wednesday' },
  { value: 4, label: 'Thu', full: 'Thursday' },
  { value: 5, label: 'Fri', full: 'Friday' },
  { value: 6, label: 'Sat', full: 'Saturday' },
];

/** "18:14" -> "6:14 PM", so a 24-hour input is unambiguous at a glance. */
function describe(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const suffix = h < 12 ? 'AM' : 'PM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** A day switched on with no time yet defaults to midnight. */
const DEFAULT_TIME = '00:00';

export default function AutomationBar({
  initialSettings,
  visionModel,
  disabled,
}: AutomationBarProps): React.JSX.Element {
  const [settings, setSettings] = useState(initialSettings);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const save = async (patch: Record<string, unknown>) => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch('/api/admin/ss4/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not save.');
        return;
      }
      setSettings(data);
      setSaved(true);
      // The key is write-only from here; clear the input so it is never
      // left sitting in the DOM after a successful save.
      if (patch.visionApiKey !== undefined) setApiKey('');
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError('Could not reach the server.');
    } finally {
      setSaving(false);
    }
  };

  const commitTimes = (times: Record<number, string>) => {
    setSettings({ ...settings, scheduleTimes: times, scheduleDays: Object.keys(times).map(Number).sort((a, b) => a - b) });
    void save({ scheduleTimes: times });
  };

  const toggleDay = (day: number) => {
    const next = { ...settings.scheduleTimes };
    if (next[day] !== undefined) delete next[day];
    else next[day] = DEFAULT_TIME;

    if (Object.keys(next).length === 0) {
      setError('Pick at least one day, or switch to manual mode.');
      return;
    }
    commitTimes(next);
  };

  const setTime = (day: number, value: string) => {
    if (!/^\d{2}:\d{2}$/.test(value)) return; // the input clears mid-edit
    commitTimes({ ...settings.scheduleTimes, [day]: value });
  };

  const isAuto = settings.automationEnabled;

  return (
    <div className="p-4 bg-white border border-gray-200 rounded-xl space-y-4">
      {/* Mode toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-gray-900 font-manrope">Generation mode</span>
          <div className="inline-flex p-0.5 bg-gray-100 rounded-lg" role="group">
            <button
              onClick={() => { setSettings({ ...settings, automationEnabled: false }); void save({ automationEnabled: false }); }}
              disabled={disabled || saving}
              aria-pressed={!isAuto}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                !isAuto ? 'bg-white text-[#34088f] shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Manual
            </button>
            <button
              onClick={() => { setSettings({ ...settings, automationEnabled: true }); void save({ automationEnabled: true }); }}
              disabled={disabled || saving}
              aria-pressed={isAuto}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                isAuto ? 'bg-white text-[#34088f] shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Automatic
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
          {saved && (
            <span className="inline-flex items-center gap-1 text-[#065f46] font-semibold">
              <Check className="w-3.5 h-3.5" /> Saved
            </span>
          )}
          {settings.lastRunAt && (
            // Rendered after mount only: toLocaleString() resolves against the
            // server's locale during SSR and the browser's on hydration, which
            // React reports as a mismatch (#418).
            <span className="text-gray-400" suppressHydrationWarning>
              {mounted ? `Last run ${new Date(settings.lastRunAt).toLocaleString()}` : ''}
            </span>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-[#991b1b]">{error}</p>}

      {/* Schedule — only meaningful in automatic mode */}
      {isAuto && (
        <div className="pt-3 border-t border-gray-100 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
            <Clock className="w-3.5 h-3.5" />
            Runs on
            <span className="font-normal text-gray-400">Pakistan time (PKT)</span>
          </div>

          {/* Compact grid: a day is a chip, and its time only appears once the
              day is on. Seven full-width rows wasted the space, since most
              schedules use two or three days. */}
          <div className="flex flex-wrap gap-2">
            {DAYS.map((day) => {
              const time = settings.scheduleTimes[day.value];
              const on = time !== undefined;
              return (
                <div
                  key={day.value}
                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 transition ${
                    on ? 'bg-[#f5f2fe] border-[#ddd6fe]' : 'bg-white border-gray-200'
                  }`}
                >
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggleDay(day.value)}
                      disabled={disabled || saving}
                      className="w-3.5 h-3.5 accent-[#34088f] cursor-pointer"
                    />
                    <span className={`text-xs font-semibold ${on ? 'text-[#34088f]' : 'text-gray-400'}`}>
                      {day.label}
                    </span>
                  </label>

                  {on && (
                    <input
                      type="time"
                      value={time}
                      disabled={disabled || saving}
                      onChange={(e) => setTime(day.value, e.target.value)}
                      aria-label={`${day.full} run time`}
                      className="w-[104px] px-1.5 py-0.5 text-xs bg-white border border-gray-200 rounded tabular-nums focus:outline-none focus:ring-2 focus:ring-[#34088f]/20 focus:border-[#34088f]"
                    />
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-gray-400">
            Checked every 15 minutes, so a run starts within a quarter-hour of the time set.
          </p>
        </div>
      )}

      {/* Vision API key */}
      <div className="pt-3 border-t border-gray-100 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
          <KeyRound className="w-3.5 h-3.5" />
          Document reading API key
          {settings.hasVisionKey && (
            <span className="px-1.5 py-0.5 text-[10px] font-semibold text-[#065f46] bg-[#d1fae5] border border-[#a7f3d0] rounded">
              Installed {settings.visionKeyHint}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[240px]">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={disabled || saving}
              placeholder={settings.hasVisionKey ? 'Enter a new key to replace the current one' : 'Paste the Anthropic API key'}
              className="w-full px-2.5 py-1.5 pr-9 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#34088f]/20 focus:border-[#34088f]"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              aria-label={showKey ? 'Hide key' : 'Show key'}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>

          <button
            onClick={() => void save({ visionApiKey: apiKey })}
            disabled={disabled || saving || !apiKey.trim()}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-[#34088f] rounded-lg hover:bg-[#2a0673] disabled:opacity-40 transition"
          >
            Save key
          </button>
        </div>

        <p className="text-[11px] text-gray-400">
          Model: <span className="font-mono">{visionModel}</span>. Used only for filings the local
          parser cannot read. The stored key is never shown again.
        </p>
      </div>
    </div>
  );
}
