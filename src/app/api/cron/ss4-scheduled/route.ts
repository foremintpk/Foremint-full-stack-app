/**
 * @file src/app/api/cron/ss4-scheduled/route.ts
 * @description Hourly tick that runs the SS-4 batch when the admin-configured
 * schedule says it is due.
 *
 * WHY AN HOURLY TICK. Vercel's cron schedule lives in vercel.json and is fixed
 * at deploy time, so it cannot express a schedule an administrator edits from
 * the UI. Instead this fires every hour and the ss4_settings row decides whether
 * a run is actually due — which is what makes "12:00 AM Monday and Thursday"
 * changeable without a redeploy.
 *
 * Guarded by CRON_SECRET, matching the other cron routes in this app.
 */

import { NextResponse } from 'next/server';
import { getEinPendingOrders } from '@/lib/services/ss4/orders';
import { generateForOrder } from '@/lib/services/ss4/ss4-extraction.service';
import { getSs4Settings, markAutomationRun } from '@/lib/services/ss4/settings';
import { sendSs4BatchEmail } from '@/lib/email/sendSs4BatchEmail';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 800;

/** Wall-clock parts of "now" in an IANA timezone. */
function nowInZone(timeZone: string): { weekday: number; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const weekdays: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };

  return {
    weekday: weekdays[get('weekday')] ?? -1,
    // Intl renders midnight as "24" in some locales/zones under hour12:false.
    hour: Number(get('hour')) % 24,
    minute: Number(get('minute')),
  };
}

export async function GET(request: Request) {
  const auth = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const settings = await getSs4Settings();

  if (!settings.automationEnabled) {
    return NextResponse.json({ skipped: 'Automation is switched off.' });
  }

  let local;
  try {
    local = nowInZone(settings.scheduleTimezone);
  } catch {
    // A bad timezone must not silently stop every scheduled run.
    local = nowInZone('UTC');
  }

  // Each scheduled day carries its own time, e.g. {"1":"09:00","4":"18:14"}.
  const todayTime = settings.scheduleTimes[local.weekday];
  if (!todayTime) {
    return NextResponse.json({ skipped: `Nothing scheduled for weekday ${local.weekday}.` });
  }

  const [targetHour, targetMinute] = todayTime.split(':').map(Number);
  const nowMinutes = local.hour * 60 + local.minute;
  const targetMinutes = targetHour * 60 + targetMinute;

  // The tick runs every 15 minutes, so a run is due when "now" falls inside the
  // window that starts at the configured time. Without this a time like 18:14
  // would never match an on-the-quarter-hour tick.
  const WINDOW_MINUTES = 15;
  const delta = nowMinutes - targetMinutes;
  if (delta < 0 || delta >= WINDOW_MINUTES) {
    return NextResponse.json({
      skipped: `Not due — scheduled ${todayTime}, local time is ${String(local.hour).padStart(2, '0')}:${String(local.minute).padStart(2, '0')} (${settings.scheduleTimezone}).`,
    });
  }

  // Guard against a double-run when the platform fires twice inside one window.
  if (settings.lastRunAt) {
    const sinceLast = Date.now() - new Date(settings.lastRunAt).getTime();
    if (sinceLast < 6 * 60 * 60 * 1000) {
      return NextResponse.json({
        skipped: `Already ran ${Math.round(sinceLast / 60000)} minutes ago.`,
      });
    }
  }

  const batchId = crypto.randomUUID();
  await markAutomationRun(batchId);

  const orders = await getEinPendingOrders();
  const results = [];

  // Sequential on purpose: the vision gateway rate-limits, and a scheduled run
  // has no one watching it, so throughput matters less than every order landing.
  for (const order of orders) {
    results.push(
      await generateForOrder({
        order,
        batchId,
        trigger: 'automatic',
        adminId: null,
      })
    );
  }

  const passed = results.filter((r) => r.status === 'passed').length;
  const failures = results
    .filter((r) => r.status !== 'passed')
    .map((r) => ({
      orderNumber: r.orderNumber,
      reason: r.failureReason ?? 'Generation failed.',
    }));

  // Tell the admin what the unattended run did. Never fatal: the packets are
  // already generated and stored, so a mail failure must not fail the run.
  const email = await sendSs4BatchEmail({ batchId, passed, failures });

  return NextResponse.json({
    batchId,
    ran: results.length,
    passed,
    failed: failures.length,
    emailed: email.sent,
    emailNote: email.skipped ?? email.error,
    at: new Date().toISOString(),
  });
}
