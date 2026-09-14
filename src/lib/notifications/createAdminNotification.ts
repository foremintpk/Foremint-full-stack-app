/**
 * @file src/lib/notifications/createAdminNotification.ts
 * @description Server-side helper for creating system → administrator notifications.
 *
 * SERVER-ONLY — do not import in Client Components.
 *
 * Why this exists
 * ---------------
 * Admin notifications are system-generated: a customer action (uploading a
 * receipt, opening a ticket, resubmitting a document) produces a row addressed
 * to `target_role: 'administrator'`. The acting user is a customer, so an
 * insert made with the request-scoped client is evaluated against the customer's
 * RLS context. `public.notifications` has SELECT and UPDATE policies but no
 * INSERT policy, so those writes are rejected and the notification is lost.
 *
 * These are trusted server-side writes on behalf of the system, not writes the
 * customer is performing in their own right, so they go through the service-role
 * client. This does NOT relax RLS: regular authenticated users still cannot
 * insert notifications.
 *
 * Every call is bounded by a timeout so a slow or stalled database cannot hold a
 * serverless function open, and failures are surfaced to the caller rather than
 * being silently swallowed.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { withTimeout, TimeoutError } from '@/lib/utils/withTimeout';

/** Insert must finish within this budget or it is abandoned. */
const NOTIFICATION_INSERT_TIMEOUT_MS = 8_000;

export interface AdminNotificationInput {
  /** Notification type discriminator, e.g. 'receipt_uploaded'. */
  type: string;
  title: string;
  body?: string | null;
  /** In-app destination for the notification. */
  link?: string | null;
  /** Defaults to 'administrator'. */
  targetRole?: string;
  /** Set only for notifications addressed to a specific user. */
  recipientId?: string | null;
  /** Optional structured metadata stored alongside the human-readable fields. */
  payload?: Record<string, unknown>;
}

export interface NotificationResult {
  ok: boolean;
  /** Present when ok === false. Safe to log; never shown to the customer. */
  error?: string;
}

/**
 * Create a notification using the service-role client.
 *
 * Never throws: notification delivery is secondary to the user action that
 * triggered it, so a failure is reported to the caller to log or act on rather
 * than propagated into the customer's request. Returning a result instead of
 * throwing is what lets callers record the failure without aborting the work
 * the customer actually asked for.
 */
export async function createAdminNotification(
  input: AdminNotificationInput
): Promise<NotificationResult> {
  try {
    const admin = createAdminClient();

    const { error } = await withTimeout(
      admin.from('notifications').insert({
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        link: input.link ?? null,
        target_role: input.targetRole ?? 'administrator',
        recipient_id: input.recipientId ?? null,
        payload: input.payload ?? {},
        is_read: false,
      } as never),
      NOTIFICATION_INSERT_TIMEOUT_MS,
      'notifications.insert'
    );

    if (error) {
      console.error('[createAdminNotification] insert failed', {
        type: input.type,
        code: error.code,
        message: error.message,
        details: error.details,
      });
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err) {
    const message =
      err instanceof TimeoutError
        ? `notification insert timed out after ${NOTIFICATION_INSERT_TIMEOUT_MS}ms`
        : err instanceof Error
          ? err.message
          : 'unknown error';

    console.error('[createAdminNotification] threw', {
      type: input.type,
      message,
    });
    return { ok: false, error: message };
  }
}
