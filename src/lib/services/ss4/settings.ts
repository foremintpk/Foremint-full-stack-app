/**
 * @file src/lib/services/ss4/settings.ts
 * @description Reads and writes the single-row SS-4 automation config.
 *
 * 1. Server vs Client choice rationale: Server-only. The row holds the vision
 *    API key, so it must never be fetched from a client component.
 * 2. Caching layer: None. The schedule and key are read by the cron and the
 *    generation service, where a stale value would either skip a scheduled run
 *    or authenticate with a rotated-out key.
 * 3. RBAC: Enforced by callers (administrator-only). The table itself is
 *    service-role-only, so a leaked anon key still reads nothing.
 * 4. Revalidation / Cache Busting: revalidateTag('ss4-settings') on write.
 */

import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { configuredVisionModel, DEFAULT_VISION_MODEL, isAnthropicApiKey } from './visionModels';

export interface Ss4Settings {
  automationEnabled: boolean;
  /**
   * Weekday -> "HH:MM" local time, e.g. { 1: '09:00', 4: '18:14' }.
   * A day present here is scheduled; a day absent is not.
   */
  scheduleTimes: Record<number, string>;
  /** Derived from scheduleTimes; kept for older readers of this row. */
  scheduleDays: number[];
  scheduleTimezone: string;
  lastRunAt: string | null;
  lastRunBatchId: string | null;
  /** Never sent to the browser — use `hasVisionKey` for display. */
  visionApiKey: string | null;
  visionModel: string;
  activeTemplateId: string | null;
  updatedAt: string | null;
}

/** The client-safe projection: everything except the key itself. */
export interface Ss4SettingsPublic extends Omit<Ss4Settings, 'visionApiKey'> {
  hasVisionKey: boolean;
  /** Last four characters, so an admin can tell which key is installed. */
  visionKeyHint: string | null;
}

interface SettingsRow {
  automation_enabled: boolean;
  schedule_days: number[] | null;
  schedule_times: Record<string, string> | null;
  schedule_timezone: string;
  last_run_at: string | null;
  last_run_batch_id: string | null;
  vision_api_key: string | null;
  vision_model: string;
  active_template_id: string | null;
  updated_at: string | null;
}

/** The business operates on Pakistan time. */
export const SCHEDULE_TIMEZONE = 'Asia/Karachi';

const DEFAULTS: Ss4Settings = {
  automationEnabled: false,
  // Midnight on Monday and Thursday.
  scheduleTimes: { 1: '00:00', 4: '00:00' },
  scheduleDays: [1, 4],
  scheduleTimezone: SCHEDULE_TIMEZONE,
  lastRunAt: null,
  lastRunBatchId: null,
  visionApiKey: null,
  visionModel: DEFAULT_VISION_MODEL,
  activeTemplateId: null,
  updatedAt: null,
};

/** Accepts only "HH:MM" with a real hour and minute. */
export function isValidTime(value: unknown): boolean {
  const m = /^(\d{2}):(\d{2})$/.exec(String(value ?? ''));
  if (!m) return false;
  return Number(m[1]) <= 23 && Number(m[2]) <= 59;
}

function fromRow(row: SettingsRow): Ss4Settings {
  const times: Record<number, string> = {};
  for (const [day, time] of Object.entries(row.schedule_times ?? {})) {
    const d = Number(day);
    if (Number.isInteger(d) && d >= 0 && d <= 6 && isValidTime(time)) times[d] = time;
  }

  return {
    automationEnabled: row.automation_enabled,
    scheduleTimes: times,
    scheduleDays: Object.keys(times).map(Number).sort((a, b) => a - b),
    // The timezone is fixed operationally; a stored oddity never reaches the
    // scheduler, where an unknown zone would silently stop every run.
    scheduleTimezone: SCHEDULE_TIMEZONE,
    lastRunAt: row.last_run_at,
    lastRunBatchId: row.last_run_batch_id,
    visionApiKey: row.vision_api_key,
    // The vision_model column is not read: it still holds the model name from
    // the previous provider, and the model is a code/env decision now.
    visionModel: configuredVisionModel(),
    activeTemplateId: row.active_template_id,
    updatedAt: row.updated_at,
  };
}

/**
 * The settings row, or defaults when the row is somehow missing. Never throws:
 * a settings read failing must not take down the EIN page, which still has to
 * render its records table.
 */
export async function getSs4Settings(): Promise<Ss4Settings> {
  const db = createAdminClient();
  const { data, error } = await db
    .from('ss4_settings')
    .select('*')
    .eq('id', true)
    .maybeSingle();

  if (error || !data) return { ...DEFAULTS };
  return fromRow(data as unknown as SettingsRow);
}

/** Strips the API key so the result is safe to pass into a client component. */
export function toPublicSettings(settings: Ss4Settings): Ss4SettingsPublic {
  const { visionApiKey, ...rest } = settings;
  // A key stored for the previous provider is not usable, so it is reported as
  // absent — otherwise the UI would say "Installed" while every read failed.
  const usable = isAnthropicApiKey(visionApiKey);
  return {
    ...rest,
    hasVisionKey: usable,
    visionKeyHint: usable ? `…${visionApiKey!.slice(-4)}` : null,
  };
}

export interface Ss4SettingsUpdate {
  automationEnabled?: boolean;
  /** Weekday -> "HH:MM". Replaces the whole schedule; {} clears it. */
  scheduleTimes?: Record<string | number, string>;
  /** Omit to leave the stored key untouched; '' clears it. */
  visionApiKey?: string;
  activeTemplateId?: string | null;
}

export async function updateSs4Settings(
  patch: Ss4SettingsUpdate,
  adminId: string
): Promise<{ success: boolean; error?: string }> {
  const row: Record<string, unknown> = { updated_by: adminId };

  if (patch.automationEnabled !== undefined) row.automation_enabled = patch.automationEnabled;
  if (patch.activeTemplateId !== undefined) row.active_template_id = patch.activeTemplateId;

  if (patch.scheduleTimes !== undefined) {
    const times: Record<string, string> = {};
    for (const [day, time] of Object.entries(patch.scheduleTimes)) {
      const d = Number(day);
      if (!Number.isInteger(d) || d < 0 || d > 6) {
        return { success: false, error: `"${day}" is not a valid day.` };
      }
      if (!isValidTime(time)) {
        return { success: false, error: `"${time}" is not a valid time. Use HH:MM.` };
      }
      times[String(d)] = time;
    }

    // Automation with no scheduled day would sit enabled and never run, which
    // reads as a broken feature rather than a configuration mistake.
    const enabled = patch.automationEnabled ?? true;
    if (enabled && Object.keys(times).length === 0) {
      return { success: false, error: 'Pick at least one day, or switch to manual mode.' };
    }

    row.schedule_times = times;
    // Kept in sync so anything still reading the old column stays correct.
    row.schedule_days = Object.keys(times).map(Number).sort((a, b) => a - b);
  }

  // An omitted key leaves the stored one alone — a settings form that posts
  // every field would otherwise wipe the key each time the schedule changes.
  if (patch.visionApiKey !== undefined) {
    row.vision_api_key = patch.visionApiKey.trim() || null;
  }

  const db = createAdminClient();
  const { error } = await db.from('ss4_settings').update(row).eq('id', true);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/** Records that an automated run happened, so the cron does not re-fire it. */
export async function markAutomationRun(batchId: string): Promise<void> {
  const db = createAdminClient();
  await db
    .from('ss4_settings')
    .update({ last_run_at: new Date().toISOString(), last_run_batch_id: batchId })
    .eq('id', true);
}
