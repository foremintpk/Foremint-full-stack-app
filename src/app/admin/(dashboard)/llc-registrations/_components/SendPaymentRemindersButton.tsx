'use client';

/**
 * @file src/app/admin/(dashboard)/llc-registrations/_components/SendPaymentRemindersButton.tsx
 * @description Bulk payment-reminder trigger, shown only while the Payment
 * Pending filter is active.
 *
 * The send is paced 10–50 s between recipients so a batch does not arrive as an
 * obvious blast, which keeps it clear of spam heuristics. That pacing means a
 * run of any size outlives a single serverless invocation, so the loop is
 * driven here on the client: each recipient is its own short server action, and
 * the operator can watch progress and stop at any point.
 *
 * Closing the tab ends the run. Anyone already emailed stays emailed and is
 * recorded in payment_reminder_log, so a later run can be judged against it.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, MailCheck, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  getPaymentPendingRecipients,
  sendSinglePaymentReminder,
  type ReminderRecipient,
} from '@/lib/admin/actions/sendPaymentReminders';

/** Inclusive bounds for the pause between two sends. */
const MIN_DELAY_MS = 10_000;
const MAX_DELAY_MS = 50_000;

const randomDelay = () =>
  Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1)) + MIN_DELAY_MS;

interface Progress {
  sent: number;
  failed: number;
  skipped: number;
  total: number;
  currentEmail: string | null;
  nextInSeconds: number | null;
}

interface SendPaymentRemindersButtonProps {
  adminId: string;
}

export function SendPaymentRemindersButton({ adminId }: SendPaymentRemindersButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [recipients, setRecipients] = useState<ReminderRecipient[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);

  // Set when the operator stops a run; every async step checks it before
  // continuing so a cancel takes effect during the wait, not after it.
  const cancelledRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const openDialog = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getPaymentPendingRecipients();
      if (!res.success) {
        toast.error(res.error ?? 'Could not load recipients');
        return;
      }
      if (!res.recipients || res.recipients.length === 0) {
        toast.info('No payment-pending orders with an email address on file.');
        return;
      }
      setRecipients(res.recipients);
      setIsOpen(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /** Interruptible sleep — resolves early when the run is cancelled. */
  const waitWithCountdown = useCallback((ms: number): Promise<void> => {
    return new Promise((resolve) => {
      const startedAt = Date.now();

      const tick = () => {
        if (cancelledRef.current) {
          resolve();
          return;
        }
        const remaining = ms - (Date.now() - startedAt);
        if (remaining <= 0) {
          setProgress((p) => (p ? { ...p, nextInSeconds: null } : p));
          resolve();
          return;
        }
        setProgress((p) =>
          p ? { ...p, nextInSeconds: Math.ceil(remaining / 1000) } : p
        );
        timerRef.current = setTimeout(tick, 1000);
      };

      tick();
    });
  }, []);

  const startSending = useCallback(async () => {
    cancelledRef.current = false;
    setIsSending(true);
    setProgress({
      sent: 0,
      failed: 0,
      skipped: 0,
      total: recipients.length,
      currentEmail: null,
      nextInSeconds: null,
    });

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (let i = 0; i < recipients.length; i++) {
      if (cancelledRef.current) break;

      const recipient = recipients[i];
      setProgress((p) => (p ? { ...p, currentEmail: recipient.clientEmail } : p));

      const res = await sendSinglePaymentReminder(recipient, adminId);

      if (res.success) {
        sent++;
      } else if (res.error?.includes('no longer payment pending')) {
        // Paid between opening the dialog and reaching this row — not a failure.
        skipped++;
      } else {
        failed++;
      }

      setProgress((p) => (p ? { ...p, sent, failed, skipped, currentEmail: null } : p));

      // Pause before the next recipient, never after the last one.
      if (i < recipients.length - 1 && !cancelledRef.current) {
        await waitWithCountdown(randomDelay());
      }
    }

    setIsSending(false);

    const wasCancelled = cancelledRef.current;
    const summary = [
      `${sent} sent`,
      failed > 0 ? `${failed} failed` : null,
      skipped > 0 ? `${skipped} skipped` : null,
    ]
      .filter(Boolean)
      .join(' · ');

    if (wasCancelled) {
      toast.info(`Reminder run stopped — ${summary}`);
    } else if (failed > 0) {
      toast.warning(`Reminders finished — ${summary}`);
    } else {
      toast.success(`Reminders sent — ${summary}`);
    }

    if (!wasCancelled) setIsOpen(false);
  }, [recipients, adminId, waitWithCountdown]);

  const handleCancel = useCallback(() => {
    cancelledRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const handleClose = useCallback(() => {
    if (isSending) return; // must stop the run first
    setIsOpen(false);
    setProgress(null);
  }, [isSending]);

  const alreadyRemindedCount = recipients.filter((r) => r.lastRemindedAt).length;

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        disabled={isLoading}
        className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white bg-[#dc2626] hover:bg-[#b91c1c] active:scale-95 transition-all rounded-full shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Send className="w-3.5 h-3.5" />
        )}
        Send Payment Reminders
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reminder-dialog-title"
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 p-6 border-b border-gray-100">
              <div>
                <h2
                  id="reminder-dialog-title"
                  className="text-lg font-bold text-gray-900 font-manrope"
                >
                  Send payment reminders?
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  This will email{' '}
                  <strong className="text-gray-900">
                    {recipients.length} customer{recipients.length === 1 ? '' : 's'}
                  </strong>{' '}
                  with a payment-pending order.
                </p>
              </div>
              {!isSending && (
                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="Close"
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-full shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {alreadyRemindedCount > 0 && !isSending && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  {alreadyRemindedCount} of these{' '}
                  {alreadyRemindedCount === 1 ? 'has' : 'have'} been reminded before.
                  Sending again will email {alreadyRemindedCount === 1 ? 'them' : 'them'}{' '}
                  a second time.
                </p>
              )}

              {!isSending && (
                <p className="text-xs text-gray-500">
                  Emails are spaced 10–50 seconds apart, so this will take roughly{' '}
                  <strong className="text-gray-700">
                    {Math.ceil((recipients.length * 30) / 60)} minute
                    {Math.ceil((recipients.length * 30) / 60) === 1 ? '' : 's'}
                  </strong>
                  . Keep this tab open until it finishes.
                </p>
              )}

              {progress && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-gray-700">
                      {progress.sent + progress.failed + progress.skipped} of{' '}
                      {progress.total} processed
                    </span>
                    <span className="text-xs text-gray-500">
                      {progress.sent} sent
                      {progress.failed > 0 && ` · ${progress.failed} failed`}
                      {progress.skipped > 0 && ` · ${progress.skipped} skipped`}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#34088f] transition-all duration-300"
                      style={{
                        width: `${
                          ((progress.sent + progress.failed + progress.skipped) /
                            Math.max(progress.total, 1)) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                  {progress.currentEmail && (
                    <p className="text-xs text-gray-500 truncate">
                      Sending to {progress.currentEmail}…
                    </p>
                  )}
                  {progress.nextInSeconds !== null && (
                    <p className="text-xs text-gray-500">
                      Next email in {progress.nextInSeconds}s
                    </p>
                  )}
                </div>
              )}

              {!isSending && (
                <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
                  {recipients.map((r) => (
                    <li
                      key={r.orderId}
                      className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 truncate">
                          {r.clientName || r.clientEmail}
                        </p>
                        <p className="text-gray-400 truncate">
                          #{r.orderNumber}
                          {r.businessName ? ` · ${r.businessName}` : ''}
                          {r.lastRemindedAt
                            ? ` · reminded ${new Date(r.lastRemindedAt).toLocaleDateString()}`
                            : ''}
                        </p>
                      </div>
                      {r.pendingAmount > 0 && (
                        <span className="font-bold text-[#b45309] shrink-0">
                          ${r.pendingAmount.toLocaleString()}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50">
              {isSending ? (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-full transition-all"
                >
                  Stop sending
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-full transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={startSending}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white bg-[#dc2626] hover:bg-[#b91c1c] active:scale-95 rounded-full transition-all"
                  >
                    <MailCheck className="w-3.5 h-3.5" />
                    Send {recipients.length} email{recipients.length === 1 ? '' : 's'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
