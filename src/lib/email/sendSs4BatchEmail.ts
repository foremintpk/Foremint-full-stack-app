/**
 * @file src/lib/email/sendSs4BatchEmail.ts
 * @description Notifies the admin when a SCHEDULED SS-4 run finishes.
 *
 * Only automatic runs send mail. A manual run happens with the operator
 * watching the progress banner, so emailing them about it would be noise.
 *
 * Sending never throws: a batch that generated twenty filed federal forms must
 * not be reported as failed because an email provider was briefly unavailable.
 * Failures are logged and returned instead.
 */

import { Resend } from 'resend';
import { Ss4BatchCompleteHtml } from './templates/ss4-batch-complete';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL ?? 'Foremint <team@raobros.site>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://foremint.pk';

export interface Ss4BatchEmailParams {
  /** Documents generated successfully. */
  passed: number;
  /** Orders that failed, with the reason recorded against each. */
  failures: { orderNumber: string; reason: string }[];
  /** The run's batch id, used to deep-link into the EIN section. */
  batchId: string;
  /** Overrides the ADMIN_EMAIL recipient; mainly for testing. */
  to?: string;
}

export interface Ss4BatchEmailResult {
  sent: boolean;
  skipped?: string;
  error?: string;
}

export async function sendSs4BatchEmail(
  params: Ss4BatchEmailParams
): Promise<Ss4BatchEmailResult> {
  const to = params.to ?? process.env.ADMIN_EMAIL;

  if (!process.env.RESEND_API_KEY) {
    return { sent: false, skipped: 'RESEND_API_KEY is not set.' };
  }
  if (!to) {
    return { sent: false, skipped: 'ADMIN_EMAIL is not set.' };
  }
  // A run that produced nothing at all is not worth an email; the failures are
  // still visible in the dashboard.
  if (params.passed === 0 && params.failures.length === 0) {
    return { sent: false, skipped: 'The run produced no results.' };
  }

  // Deep link straight to the run, so "Download the documents" lands on the
  // batch rather than the top of the section.
  const batchUrl = `${APP_URL}/admin/ein?batch=${encodeURIComponent(params.batchId)}`;

  const finishedAt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Karachi',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date());

  const failed = params.failures.length;
  const subject =
    failed > 0
      ? `${params.passed} SS-4 documents generated, ${failed} failed`
      : `${params.passed} SS-4 document${params.passed === 1 ? '' : 's'} generated`;

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject,
      html: Ss4BatchCompleteHtml({
        passed: params.passed,
        failures: params.failures,
        finishedAt: `${finishedAt} PKT`,
        batchUrl,
        logoUrl: `${APP_URL}/logo_blue.png`,
      }),
    });

    if (error) {
      console.error('[ss4] batch email failed:', error.message);
      return { sent: false, error: error.message };
    }
    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[ss4] batch email threw:', message);
    return { sent: false, error: message };
  }
}
