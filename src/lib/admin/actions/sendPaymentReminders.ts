/**
 * @file src/lib/admin/actions/sendPaymentReminders.ts
 * @description Server Actions backing the bulk payment-reminder send on the LLC
 * Registrations list.
 *
 * Shape of the feature
 * --------------------
 * The admin clicks "Send Payment Reminders" while the Payment Pending filter is
 * active. The client first calls `getPaymentPendingRecipients` to show a
 * confirmation dialog with the exact recipient list, then sends them one at a
 * time through `sendSinglePaymentReminder`, pausing 10–50 s between each.
 *
 * Why one recipient per call: a serverless function cannot stay alive for the
 * length of a staggered run (20 recipients averages ~10 minutes, well past
 * Vercel's limit). Driving the loop from the client — through the existing
 * batch-job machinery — keeps every individual send inside its own short
 * request, lets the operator watch progress, and lets them cancel part-way.
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidateTag } from 'next/cache';
import { sendPaymentReminderEmail } from '@/lib/email/sendOrderStatusEmails';

export interface ReminderRecipient {
  orderId: string;
  orderNumber: string;
  clientName: string;
  clientEmail: string;
  businessName: string;
  pendingAmount: number;
  /** ISO timestamp of the most recent successful reminder, when one exists. */
  lastRemindedAt: string | null;
}

async function requireStaff(): Promise<
  { ok: true; role: string } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const { data: role, error } = await supabase.rpc('get_my_role');

  if (
    error ||
    (role !== 'administrator' && role !== 'manager' && role !== 'account_manager')
  ) {
    return { ok: false, error: 'Unauthorized: Admin role required' };
  }

  return { ok: true, role: role as string };
}

/**
 * Every order currently in `payment_pending`, with the contact details the
 * reminder needs and when each was last contacted.
 *
 * Read before sending so the confirmation dialog can state exactly who will be
 * emailed rather than only how many.
 */
export async function getPaymentPendingRecipients(): Promise<{
  success: boolean;
  recipients?: ReminderRecipient[];
  error?: string;
}> {
  const auth = await requireStaff();
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const admin = createAdminClient();

    const { data, error } = await admin
      .from('orders')
      .select(
        'id, order_number, form_snapshot, pending_amount_usd, grand_total, payment_status, profiles!orders_user_id_fkey(full_name, email)'
      )
      .eq('status', 'payment_pending')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[sendPaymentReminders] recipient query failed', error);
      return { success: false, error: error.message };
    }

    const rows = (data ?? []) as Record<string, unknown>[];
    if (rows.length === 0) return { success: true, recipients: [] };

    // One query for the whole set rather than per order, so the dialog can show
    // "last reminded" without N round trips.
    const { data: logRows } = await admin
      .from('payment_reminder_log')
      .select('order_id, sent_at')
      .in('order_id', rows.map((r) => r.id as string))
      .eq('status', 'sent')
      .order('sent_at', { ascending: false });

    const lastSent = new Map<string, string>();
    for (const entry of (logRows ?? []) as Record<string, unknown>[]) {
      const key = entry.order_id as string;
      // Rows arrive newest first, so the first sighting is the latest.
      if (!lastSent.has(key)) lastSent.set(key, entry.sent_at as string);
    }

    const recipients: ReminderRecipient[] = rows
      .map((row) => {
        const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
        const p = (profile ?? {}) as Record<string, unknown>;
        const snapshot =
          row.form_snapshot && typeof row.form_snapshot === 'object'
            ? (row.form_snapshot as Record<string, unknown>)
            : {};

        return {
          orderId: row.id as string,
          orderNumber: (row.order_number as string) ?? (row.id as string).slice(0, 8),
          clientName: (p.full_name as string) ?? '',
          clientEmail: (p.email as string) ?? '',
          businessName: typeof snapshot.businessName === 'string' ? snapshot.businessName : '',
          pendingAmount:
            row.payment_status === 'paid'
              ? 0
              : Number(row.pending_amount_usd ?? row.grand_total ?? 0),
          lastRemindedAt: lastSent.get(row.id as string) ?? null,
        };
      })
      // An order with no email on file cannot be reminded; drop it here so the
      // count in the dialog matches what will actually be sent.
      .filter((r) => r.clientEmail.length > 0);

    return { success: true, recipients };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    };
  }
}

/**
 * Send one reminder and record the outcome.
 *
 * Returns success/failure for this recipient only — the caller keeps going
 * through the rest of the batch either way, so one bad address cannot halt a
 * run. Both outcomes are written to `payment_reminder_log`, so a failure stays
 * visible and can be retried deliberately.
 */
export async function sendSinglePaymentReminder(
  recipient: ReminderRecipient,
  adminId: string
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireStaff();
  if (!auth.ok) return { success: false, error: auth.error };

  const admin = createAdminClient();

  // Re-check the status at send time. The list was read when the dialog opened,
  // and an order may have been paid since — emailing that customer a reminder
  // would be worse than skipping them.
  const { data: current } = await admin
    .from('orders')
    .select('status')
    .eq('id', recipient.orderId)
    .single();

  const status = (current as Record<string, unknown> | null)?.status;
  if (status !== 'payment_pending') {
    return { success: false, error: 'Order is no longer payment pending — skipped' };
  }

  const result = await sendPaymentReminderEmail({
    to: recipient.clientEmail,
    userName: recipient.clientName,
    orderNumber: recipient.orderNumber,
    businessName: recipient.businessName,
    pendingAmount: recipient.pendingAmount,
  });

  await admin.from('payment_reminder_log').insert({
    order_id: recipient.orderId,
    sent_to: recipient.clientEmail,
    sent_by: adminId || null,
    status: result.ok ? 'sent' : 'failed',
    error_message: result.ok ? null : (result.error ?? 'unknown error'),
  } as never);

  if (!result.ok) {
    console.error('[sendPaymentReminders] send failed', {
      orderId: recipient.orderId,
      error: result.error,
    });
    return { success: false, error: result.error ?? 'Send failed' };
  }

  revalidateTag(`order-${recipient.orderId}`, 'max');
  return { success: true };
}
